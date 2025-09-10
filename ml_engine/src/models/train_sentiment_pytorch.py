"""
PyTorch fine-tuning of DistilBERT for sentiment classification.

Implements a custom training loop with:
- DistilBERT encoder + linear classification head
- AdamW optimizer with linear warmup and cosine decay
- Train/validation/test split (80/10/10)
- Early stopping on validation loss
- Per-epoch loss and accuracy logging
- Saves best model checkpoint via torch.save()
"""

import os
import sys
import json
import math
import random
import logging
from pathlib import Path
from typing import List, Tuple, Dict, Optional

import numpy as np
import torch
import torch.nn as nn
from torch.utils.data import Dataset, DataLoader, random_split
from torch.optim import AdamW

try:
    from transformers import AutoModel, AutoTokenizer
except ImportError:
    raise ImportError(
        "transformers library required. Install with: pip install transformers"
    )

# Add parent to path for data generation imports
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from src.data.generate_reviews import generate_dataset

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger(__name__)

LABEL_MAP = {"negative": 0, "neutral": 1, "positive": 2}
ID_TO_LABEL = {v: k for k, v in LABEL_MAP.items()}


# ------------------------------------------------------------------
# Dataset
# ------------------------------------------------------------------


class SentimentDataset(Dataset):
    """PyTorch dataset for sentiment classification.

    Tokenizes text on-the-fly using a HuggingFace tokenizer and returns
    input_ids, attention_mask, and integer label tensors.
    """

    def __init__(
        self,
        texts: List[str],
        labels: List[str],
        tokenizer: AutoTokenizer,
        max_length: int = 128,
    ) -> None:
        self.texts = texts
        self.labels = [LABEL_MAP[label] for label in labels]
        self.tokenizer = tokenizer
        self.max_length = max_length

    def __len__(self) -> int:
        return len(self.texts)

    def __getitem__(self, idx: int) -> Dict[str, torch.Tensor]:
        encoding = self.tokenizer(
            self.texts[idx],
            max_length=self.max_length,
            padding="max_length",
            truncation=True,
            return_tensors="pt",
        )
        return {
            "input_ids": encoding["input_ids"].squeeze(0),
            "attention_mask": encoding["attention_mask"].squeeze(0),
            "label": torch.tensor(self.labels[idx], dtype=torch.long),
        }


# ------------------------------------------------------------------
# Model
# ------------------------------------------------------------------


class DistilBertSentimentClassifier(nn.Module):
    """DistilBERT encoder with a linear classification head.

    Pools the [CLS] token output, applies dropout, then projects to
    ``num_classes`` logits.
    """

    def __init__(
        self,
        model_name: str = "distilbert-base-uncased",
        num_classes: int = 3,
        dropout: float = 0.3,
    ) -> None:
        super().__init__()
        self.encoder = AutoModel.from_pretrained(model_name)
        hidden_size = self.encoder.config.hidden_size
        self.dropout = nn.Dropout(dropout)
        self.classifier = nn.Linear(hidden_size, num_classes)

    def forward(
        self,
        input_ids: torch.Tensor,
        attention_mask: torch.Tensor,
    ) -> torch.Tensor:
        """Return logits of shape (batch_size, num_classes)."""
        outputs = self.encoder(input_ids=input_ids, attention_mask=attention_mask)
        cls_output = outputs.last_hidden_state[:, 0, :]  # [CLS] token
        cls_output = self.dropout(cls_output)
        logits = self.classifier(cls_output)
        return logits


# ------------------------------------------------------------------
# Learning-rate schedule: linear warmup + cosine decay
# ------------------------------------------------------------------


def get_lr_lambda(
    warmup_steps: int,
    total_steps: int,
) -> callable:
    """Return a learning-rate lambda for linear warmup then cosine decay."""

    def lr_lambda(current_step: int) -> float:
        if current_step < warmup_steps:
            return float(current_step) / float(max(1, warmup_steps))
        progress = float(current_step - warmup_steps) / float(
            max(1, total_steps - warmup_steps)
        )
        return max(0.0, 0.5 * (1.0 + math.cos(math.pi * progress)))

    return lr_lambda


# ------------------------------------------------------------------
# Training loop
# ------------------------------------------------------------------


def train_one_epoch(
    model: nn.Module,
    dataloader: DataLoader,
    optimizer: AdamW,
    scheduler: torch.optim.lr_scheduler.LambdaLR,
    criterion: nn.Module,
    device: torch.device,
) -> Tuple[float, float]:
    """Train for one epoch. Returns (average_loss, accuracy)."""
    model.train()
    total_loss = 0.0
    correct = 0
    total = 0

    for batch in dataloader:
        input_ids = batch["input_ids"].to(device)
        attention_mask = batch["attention_mask"].to(device)
        labels = batch["label"].to(device)

        optimizer.zero_grad()
        logits = model(input_ids, attention_mask)
        loss = criterion(logits, labels)
        loss.backward()
        torch.nn.utils.clip_grad_norm_(model.parameters(), max_norm=1.0)
        optimizer.step()
        scheduler.step()

        total_loss += loss.item() * labels.size(0)
        preds = logits.argmax(dim=1)
        correct += (preds == labels).sum().item()
        total += labels.size(0)

    return total_loss / total, correct / total


@torch.no_grad()
def evaluate(
    model: nn.Module,
    dataloader: DataLoader,
    criterion: nn.Module,
    device: torch.device,
) -> Tuple[float, float]:
    """Evaluate the model. Returns (average_loss, accuracy)."""
    model.eval()
    total_loss = 0.0
    correct = 0
    total = 0

    for batch in dataloader:
        input_ids = batch["input_ids"].to(device)
        attention_mask = batch["attention_mask"].to(device)
        labels = batch["label"].to(device)

        logits = model(input_ids, attention_mask)
        loss = criterion(logits, labels)

        total_loss += loss.item() * labels.size(0)
        preds = logits.argmax(dim=1)
        correct += (preds == labels).sum().item()
        total += labels.size(0)

    return total_loss / total, correct / total


# ------------------------------------------------------------------
# Main training function
# ------------------------------------------------------------------


def train_sentiment_pytorch(
    n_samples: int = 5000,
    epochs: int = 5,
    batch_size: int = 32,
    learning_rate: float = 2e-5,
    warmup_ratio: float = 0.1,
    patience: int = 2,
    max_length: int = 128,
    model_name: str = "distilbert-base-uncased",
    output_dir: str = "./models/sentiment_pytorch",
    results_dir: str = "./training_results",
    seed: int = 42,
) -> Dict:
    """End-to-end training pipeline.

    Args:
        n_samples: Number of synthetic reviews to generate.
        epochs: Maximum training epochs.
        batch_size: Batch size for training and evaluation.
        learning_rate: Peak learning rate for AdamW.
        warmup_ratio: Fraction of total steps used for warmup.
        patience: Early stopping patience (epochs without val loss improvement).
        max_length: Maximum token length for the tokenizer.
        model_name: HuggingFace model identifier.
        output_dir: Where to save the best model checkpoint.
        results_dir: Where to save training metrics JSON.
        seed: Random seed for reproducibility.

    Returns:
        Dictionary of final evaluation metrics.
    """
    # Reproducibility
    random.seed(seed)
    np.random.seed(seed)
    torch.manual_seed(seed)

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    logger.info("Device: %s", device)

    # ------------------------------------------------------------------
    # Data
    # ------------------------------------------------------------------
    logger.info("Generating %d synthetic reviews...", n_samples)
    texts, labels = generate_dataset(n_samples)

    tokenizer = AutoTokenizer.from_pretrained(model_name)
    full_dataset = SentimentDataset(texts, labels, tokenizer, max_length)

    # 80 / 10 / 10 split
    n_total = len(full_dataset)
    n_test = int(n_total * 0.1)
    n_val = int(n_total * 0.1)
    n_train = n_total - n_val - n_test
    train_ds, val_ds, test_ds = random_split(
        full_dataset,
        [n_train, n_val, n_test],
        generator=torch.Generator().manual_seed(seed),
    )

    train_loader = DataLoader(train_ds, batch_size=batch_size, shuffle=True)
    val_loader = DataLoader(val_ds, batch_size=batch_size)
    test_loader = DataLoader(test_ds, batch_size=batch_size)

    logger.info("Split: train=%d  val=%d  test=%d", n_train, n_val, n_test)

    # ------------------------------------------------------------------
    # Model, optimizer, scheduler
    # ------------------------------------------------------------------
    model = DistilBertSentimentClassifier(
        model_name=model_name, num_classes=3, dropout=0.3
    ).to(device)

    optimizer = AdamW(
        model.parameters(), lr=learning_rate, weight_decay=0.01
    )

    total_steps = len(train_loader) * epochs
    warmup_steps = int(total_steps * warmup_ratio)
    scheduler = torch.optim.lr_scheduler.LambdaLR(
        optimizer, lr_lambda=get_lr_lambda(warmup_steps, total_steps)
    )

    criterion = nn.CrossEntropyLoss()

    # ------------------------------------------------------------------
    # Training loop with early stopping
    # ------------------------------------------------------------------
    best_val_loss = float("inf")
    epochs_without_improvement = 0
    history: List[Dict] = []

    os.makedirs(output_dir, exist_ok=True)
    best_model_path = os.path.join(output_dir, "best_model.pt")

    for epoch in range(1, epochs + 1):
        train_loss, train_acc = train_one_epoch(
            model, train_loader, optimizer, scheduler, criterion, device
        )
        val_loss, val_acc = evaluate(model, val_loader, criterion, device)

        epoch_metrics = {
            "epoch": epoch,
            "train_loss": round(train_loss, 4),
            "train_accuracy": round(train_acc, 4),
            "val_loss": round(val_loss, 4),
            "val_accuracy": round(val_acc, 4),
        }
        history.append(epoch_metrics)

        logger.info(
            "Epoch %d/%d  train_loss=%.4f  train_acc=%.4f  val_loss=%.4f  val_acc=%.4f",
            epoch,
            epochs,
            train_loss,
            train_acc,
            val_loss,
            val_acc,
        )

        # Checkpoint if improved
        if val_loss < best_val_loss:
            best_val_loss = val_loss
            epochs_without_improvement = 0
            torch.save(
                {
                    "epoch": epoch,
                    "model_state_dict": model.state_dict(),
                    "optimizer_state_dict": optimizer.state_dict(),
                    "val_loss": val_loss,
                    "val_accuracy": val_acc,
                },
                best_model_path,
            )
            logger.info("  Saved best model (val_loss=%.4f)", val_loss)
        else:
            epochs_without_improvement += 1
            if epochs_without_improvement >= patience:
                logger.info("Early stopping at epoch %d", epoch)
                break

    # ------------------------------------------------------------------
    # Test evaluation with best model
    # ------------------------------------------------------------------
    checkpoint = torch.load(best_model_path, map_location=device, weights_only=True)
    model.load_state_dict(checkpoint["model_state_dict"])
    test_loss, test_acc = evaluate(model, test_loader, criterion, device)

    logger.info("Test loss=%.4f  Test accuracy=%.4f", test_loss, test_acc)

    # ------------------------------------------------------------------
    # Save results
    # ------------------------------------------------------------------
    os.makedirs(results_dir, exist_ok=True)
    results = {
        "model": "distilbert_pytorch",
        "base_model": model_name,
        "n_samples": n_samples,
        "n_train": n_train,
        "n_val": n_val,
        "n_test": n_test,
        "epochs_trained": len(history),
        "batch_size": batch_size,
        "learning_rate": learning_rate,
        "warmup_ratio": warmup_ratio,
        "max_length": max_length,
        "test_loss": round(test_loss, 4),
        "test_accuracy": round(test_acc, 4),
        "best_val_loss": round(best_val_loss, 4),
        "history": history,
    }
    results_path = os.path.join(results_dir, "sentiment_pytorch_results.json")
    with open(results_path, "w") as f:
        json.dump(results, f, indent=2)

    logger.info("Results saved to %s", results_path)
    logger.info("Model checkpoint saved to %s", best_model_path)

    return results


# ------------------------------------------------------------------
# CLI
# ------------------------------------------------------------------

if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(
        description="Fine-tune DistilBERT for sentiment classification"
    )
    parser.add_argument("--samples", type=int, default=5000)
    parser.add_argument("--epochs", type=int, default=5)
    parser.add_argument("--batch-size", type=int, default=32)
    parser.add_argument("--lr", type=float, default=2e-5)
    parser.add_argument("--patience", type=int, default=2)
    parser.add_argument("--max-length", type=int, default=128)
    parser.add_argument("--output-dir", default="./models/sentiment_pytorch")
    parser.add_argument("--results-dir", default="./training_results")
    parser.add_argument("--seed", type=int, default=42)
    args = parser.parse_args()

    train_sentiment_pytorch(
        n_samples=args.samples,
        epochs=args.epochs,
        batch_size=args.batch_size,
        learning_rate=args.lr,
        patience=args.patience,
        max_length=args.max_length,
        output_dir=args.output_dir,
        results_dir=args.results_dir,
        seed=args.seed,
    )
