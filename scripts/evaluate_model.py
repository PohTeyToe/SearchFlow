"""Cold model evaluation for CI — trains from scratch and validates AUC-ROC.

Usage: python scripts/evaluate_model.py
Exit 0 if AUC-ROC >= 0.83, exit 1 otherwise.
"""

import sys
from pathlib import Path

import pandas as pd
from sklearn.model_selection import train_test_split

# Add ml_engine/src to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent / "ml_engine" / "src"))
from models.churn import ChurnPredictor, engineer_features

THRESHOLD = 0.83
DATA_PATH = Path(__file__).parent.parent / "data" / "raw" / "hotel_bookings.csv"


def main():
    if not DATA_PATH.exists():
        print(f"ERROR: Dataset not found at {DATA_PATH}")
        print("Run scripts/download_datasets.sh first.")
        sys.exit(1)

    # Load and engineer features
    raw = pd.read_csv(DATA_PATH)
    df = engineer_features(raw)

    X = df.drop(columns=["is_canceled"])
    y = df["is_canceled"]

    # Stratified train/test split
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, stratify=y, random_state=42
    )

    # Train model with same hyperparameters as train_churn.py
    predictor = ChurnPredictor()
    predictor.fit(X_train, y_train, eval_set=(X_test, y_test))

    # Evaluate using the predictor's built-in method (handles scaling)
    metrics = predictor.evaluate(X_test, y_test)

    auc = metrics.auc
    acc = metrics.accuracy
    prec = metrics.precision
    rec = metrics.recall
    f1 = metrics.f1

    print("=" * 48)
    print("       Model Evaluation Results")
    print("=" * 48)
    print(f"  AUC-ROC:    {auc:.4f}")
    print(f"  Accuracy:   {acc:.4f}")
    print(f"  Precision:  {prec:.4f}")
    print(f"  Recall:     {rec:.4f}")
    print(f"  F1 Score:   {f1:.4f}")
    print("=" * 48)

    if auc >= THRESHOLD:
        print(f"PASS: AUC-ROC {auc:.4f} >= {THRESHOLD} threshold")
        sys.exit(0)
    else:
        print(f"FAIL: AUC-ROC {auc:.4f} < {THRESHOLD} threshold")
        sys.exit(1)


if __name__ == "__main__":
    main()
