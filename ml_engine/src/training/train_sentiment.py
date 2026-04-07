"""
Train the sentiment analysis model.

Loads real review CSVs when available, falls back to synthetic generation.
Trains DistilBERT or TF-IDF model and evaluates classification accuracy.
"""

import glob
import json
import os
import sys
from pathlib import Path
from typing import Optional

import mlflow
import mlflow.sklearn
import pandas as pd
from sklearn.metrics import f1_score
from sklearn.model_selection import train_test_split

# Add parent to path
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from src.data.generate_reviews import generate_dataset
from src.models.sentiment import SentimentAnalyzer


def load_reviews(data_dir: str) -> Optional[pd.DataFrame]:
    """Load review CSVs from data_dir.

    Looks for CSV files with text+sentiment or text+rating columns.
    Star ratings are mapped: 4-5=positive, 1-2=negative, 3=neutral.

    Returns DataFrame with text+sentiment columns, or None if no match.
    """
    csv_files = glob.glob(os.path.join(data_dir, "*.csv"))

    for csv_file in csv_files:
        try:
            df = pd.read_csv(csv_file, nrows=5)  # peek at columns
        except Exception:
            continue

        if "text" not in df.columns:
            continue

        df = pd.read_csv(csv_file)

        if "sentiment" in df.columns:
            return df[["text", "sentiment"]].dropna()

        if "rating" in df.columns:
            df["sentiment"] = df["rating"].map(
                lambda r: "positive" if r >= 4 else "negative" if r <= 2 else "neutral"
            )
            return df[["text", "sentiment"]].dropna()

    return None


def train_sentiment(
    n_samples: int = 25000,
    use_bert: bool = False,
    model_path: str = "./models/sentiment",
    data_dir: str = "data/raw",
):
    """Train and save the sentiment model."""
    tracking_uri = os.environ.get("MLFLOW_TRACKING_URI", "http://localhost:5000")
    mlflow.set_tracking_uri(tracking_uri)
    mlflow.set_experiment("sentiment-analysis")
    mlflow.sklearn.autolog()

    print("=" * 50)
    print("Training Sentiment Analysis Model")
    print("=" * 50)

    # Try real data first, fall back to synthetic
    print("\n[1/4] Loading review data...")
    reviews = load_reviews(data_dir)
    if reviews is not None:
        texts = reviews["text"].tolist()
        labels = reviews["sentiment"].tolist()
        data_source = "csv"
        print(f"  Loaded {len(texts):,} real reviews from {data_dir}")
    else:
        print(f"  No review CSVs found in {data_dir}, using synthetic data")
        texts, labels = generate_dataset(n_samples)
        data_source = "synthetic"

    print(f"  Positive: {labels.count('positive'):,}")
    print(f"  Negative: {labels.count('negative'):,}")
    print(f"  Neutral: {labels.count('neutral'):,}")

    # Split data
    print("\n[2/4] Splitting data...")
    train_texts, test_texts, train_labels, test_labels = train_test_split(
        texts, labels, test_size=0.2, random_state=42, stratify=labels
    )
    print(f"  Train: {len(train_texts):,}")
    print(f"  Test: {len(test_texts):,}")

    # Train model with MLflow tracking
    print(f"\n[3/4] Training {'BERT' if use_bert else 'TF-IDF'} model...")

    with mlflow.start_run():
        if use_bert:
            analyzer = SentimentAnalyzer(use_bert=True)
            analyzer.fit(
                train_texts, train_labels,
                val_texts=test_texts[:500],
                val_labels=test_labels[:500],
                epochs=3,
                batch_size=16,
                output_dir=model_path
            )
        else:
            # Use TF-IDF for faster training
            analyzer = SentimentAnalyzer(use_bert=False)
            analyzer.fit(train_texts, train_labels)

        # Evaluate
        print("\n[4/4] Evaluating model...")

        predictions = []
        eval_texts = test_texts[:1000]
        eval_labels = test_labels[:1000]

        for text in eval_texts:
            result = analyzer.predict(text)
            predictions.append(result.sentiment)

        correct = sum(1 for p, t in zip(predictions, eval_labels) if p == t)
        accuracy = correct / len(eval_labels)

        # Log metrics
        f1_macro = f1_score(eval_labels, predictions, average="macro",
                            labels=["positive", "negative", "neutral"])
        mlflow.log_metric("accuracy", accuracy)
        mlflow.log_metric("f1_macro", float(f1_macro))
        mlflow.log_params({
            "n_samples": len(texts),
            "n_train": len(train_texts),
            "n_test": len(test_texts),
            "model_type": "bert" if use_bert else "tfidf_logreg",
            "data_source": data_source,
        })

        # Per-class F1
        label_names = ["positive", "negative", "neutral"]
        try:
            f1_scores = f1_score(eval_labels, predictions, average=None, labels=label_names)
            for name, score in zip(label_names, f1_scores):
                mlflow.log_metric(f"f1_{name}", float(score))
        except Exception:
            pass

        print(f"\n  Accuracy: {accuracy:.2%}")

        # Save model
        print(f"\n  Saving model to {model_path}...")
        analyzer.save(model_path)

        # Log model artifact
        try:
            if hasattr(analyzer, 'model') and hasattr(analyzer.model, 'predict'):
                mlflow.sklearn.log_model(analyzer.model, "model")
        except Exception:
            pass

        # Save evaluation results
        results_dir = os.path.join(os.path.dirname(model_path), "..", "training_results")
        os.makedirs(results_dir, exist_ok=True)
        results = {
            "model": "bert" if use_bert else "tfidf_logreg",
            "data_source": data_source,
            "n_samples": len(texts),
            "n_train": len(train_texts),
            "n_test": len(test_texts),
            "accuracy": round(float(accuracy), 4),
            "f1_macro": round(float(f1_macro), 4),
            "label_distribution": {
                "positive": labels.count("positive"),
                "negative": labels.count("negative"),
                "neutral": labels.count("neutral"),
            },
        }
        with open(os.path.join(results_dir, "sentiment_results.json"), "w") as f:
            json.dump(results, f, indent=2)

        print("\n  Sentiment model trained successfully!")
        print(f"   Classification Accuracy: {accuracy:.2%}")

        # Show sample predictions
        print("\n  Sample Predictions:")
        samples = [
            "Amazing hotel in Miami! Best vacation ever!",
            "Terrible service, would not recommend.",
            "The trip was okay, nothing special."
        ]
        for sample in samples:
            result = analyzer.predict(sample)
            print(f"  '{sample[:50]}...'")
            print(f"    -> {result.sentiment} ({result.confidence:.2%})")

    return analyzer, accuracy


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser()
    parser.add_argument("--samples", type=int, default=25000)
    parser.add_argument("--use-bert", action="store_true")
    parser.add_argument("--model-path", default="./models/sentiment")
    parser.add_argument("--data-dir", default="data/raw")
    args = parser.parse_args()

    train_sentiment(args.samples, args.use_bert, args.model_path, args.data_dir)
