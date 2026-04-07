"""
Train the churn prediction model on real hotel booking data.

Loads hotel_bookings.csv, engineers features, trains XGBoost,
evaluates on holdout set, and logs everything to MLflow.
"""

import json
import os
import sys
import tempfile
from pathlib import Path

import mlflow
import mlflow.xgboost
import pandas as pd
from sklearn.model_selection import train_test_split

# Add parent to path
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from src.models.churn import ChurnPredictor, engineer_features


def load_hotel_bookings(data_dir: str = "data/raw") -> pd.DataFrame:
    """Load and clean hotel_bookings.csv."""
    path = os.path.join(data_dir, "hotel_bookings.csv")
    df = pd.read_csv(path)

    # Clean known data issues
    df["children"] = df["children"].fillna(0)
    df["agent"] = df["agent"].fillna(0)
    df["company"] = df["company"].fillna(0)

    # Drop rows with zero guests (data quality issue)
    total_guests = df["adults"] + df["children"] + df["babies"]
    df = df[total_guests > 0].reset_index(drop=True)

    return df


def train_churn(
    data_dir: str = "data/raw",
    model_path: str = "./models/churn",
):
    """Train and save the churn prediction model."""
    tracking_uri = os.environ.get("MLFLOW_TRACKING_URI", "http://localhost:5000")
    mlflow.set_tracking_uri(tracking_uri)
    mlflow.set_experiment("churn-prediction")
    mlflow.xgboost.autolog()

    print("=" * 50)
    print("Training Churn Prediction Model v2.0")
    print("=" * 50)

    # Load real data
    print("\n[1/4] Loading hotel booking data...")
    raw = load_hotel_bookings(data_dir)
    print(f"  Rows after cleaning: {len(raw):,}")

    # Engineer features
    print("\n[2/4] Engineering features...")
    features = engineer_features(raw)
    X = features[ChurnPredictor.FEATURE_NAMES]
    y = features["is_canceled"]

    print(f"  Features: {len(ChurnPredictor.FEATURE_NAMES)}")
    print(f"  Cancel rate: {y.mean():.1%}")

    # Split data
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )
    print(f"  Train: {len(X_train):,} | Test: {len(X_test):,}")

    # Train model with MLflow tracking
    print("\n[3/4] Training XGBoost model...")

    with mlflow.start_run(run_name="churn_v2"):
        predictor = ChurnPredictor(
            n_estimators=200,
            max_depth=6,
            learning_rate=0.1,
        )
        predictor.fit(X_train, y_train, eval_set=(X_test, y_test))

        # Evaluate
        print("\n[4/4] Evaluating model...")
        metrics = predictor.evaluate(X_test, y_test)

        mlflow.log_metrics({
            "auc": float(metrics.auc),
            "accuracy": float(metrics.accuracy),
            "precision": float(metrics.precision),
            "recall": float(metrics.recall),
            "f1": float(metrics.f1),
        })

        mlflow.log_params({
            "model_version": ChurnPredictor.MODEL_VERSION,
            "n_features": len(ChurnPredictor.FEATURE_NAMES),
            "data_source": "hotel_bookings",
            "n_rows": len(raw),
            "n_train": len(X_train),
            "n_test": len(X_test),
            "cancel_rate": round(float(y.mean()), 4),
        })

        print(f"\n  AUC:       {metrics.auc:.4f}")
        print(f"  Accuracy:  {metrics.accuracy:.4f}")
        print(f"  Precision: {metrics.precision:.4f}")
        print(f"  Recall:    {metrics.recall:.4f}")
        print(f"  F1:        {metrics.f1:.4f}")

        # Feature importance
        print("\n  Top Feature Importance:")
        importance = predictor.get_feature_importance()
        for _, row in importance.head(5).iterrows():
            print(f"    {row['feature']}: {row['importance']:.3f}")

        # Log feature importance as artifact
        importance_path = os.path.join(tempfile.mkdtemp(), "feature_importance.json")
        importance.head(10).to_json(importance_path, orient="records", indent=2)
        mlflow.log_artifact(importance_path)

        # Log SHAP summary plot
        try:
            import matplotlib
            import shap
            matplotlib.use("Agg")
            import matplotlib.pyplot as plt

            explainer = shap.TreeExplainer(predictor.model)
            X_test_scaled = predictor.scaler.transform(X_test)
            shap_values = explainer.shap_values(X_test_scaled)
            shap.summary_plot(
                shap_values, X_test,
                feature_names=ChurnPredictor.FEATURE_NAMES, show=False,
            )
            shap_path = os.path.join(tempfile.mkdtemp(), "shap_summary.png")
            plt.savefig(shap_path, dpi=100, bbox_inches="tight")
            plt.close()
            mlflow.log_artifact(shap_path)
            print("  SHAP summary plot logged to MLflow")
        except Exception as e:
            print(f"  Warning: Could not generate SHAP plot: {e}")

        # Save model
        print(f"\n  Saving model to {model_path}...")
        predictor.save(model_path)

        # Save evaluation results
        results_dir = os.path.join(os.path.dirname(model_path), "..", "training_results")
        os.makedirs(results_dir, exist_ok=True)
        results = {
            "model": "xgboost",
            "model_version": ChurnPredictor.MODEL_VERSION,
            "data_source": "hotel_bookings.csv",
            "n_rows": len(raw),
            "n_train": len(X_train),
            "n_test": len(X_test),
            "cancel_rate": round(float(y.mean()), 4),
            "auc": round(float(metrics.auc), 4),
            "accuracy": round(float(metrics.accuracy), 4),
            "precision": round(float(metrics.precision), 4),
            "recall": round(float(metrics.recall), 4),
            "f1": round(float(metrics.f1), 4),
            "n_estimators": 200,
            "max_depth": 6,
            "learning_rate": 0.1,
            "top_features": [
                {"feature": row["feature"], "importance": round(float(row["importance"]), 4)}
                for _, row in importance.head(5).iterrows()
            ],
        }
        with open(os.path.join(results_dir, "churn_results.json"), "w") as f:
            json.dump(results, f, indent=2)

        print("\n  Churn model v2.0 trained successfully!")
        print(f"  AUC-ROC: {metrics.auc:.4f}")

    return predictor, metrics


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser()
    parser.add_argument("--data-dir", default="data/raw")
    parser.add_argument("--model-path", default="./models/churn")
    args = parser.parse_args()

    train_churn(args.data_dir, args.model_path)
