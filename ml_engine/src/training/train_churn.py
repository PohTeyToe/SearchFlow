"""
Train the churn prediction model.

Builds features from user behavior, trains XGBoost classifier,
and generates SHAP explanations.
"""

import json
import os
import sys
import tempfile
import numpy as np
import pandas as pd
from pathlib import Path
from sklearn.model_selection import train_test_split

import mlflow
import mlflow.xgboost

# Add parent to path
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from src.models.churn import ChurnPredictor, ChurnPredictor


def generate_synthetic_churn_data(n_users: int = 10000) -> pd.DataFrame:
    """Generate synthetic user features with churn labels."""
    np.random.seed(42)
    
    data = []
    
    for i in range(n_users):
        # Generate behavior features
        sessions_7d = np.random.poisson(2)
        sessions_30d = sessions_7d + np.random.poisson(5)
        sessions_90d = sessions_30d + np.random.poisson(10)
        
        searches = np.random.poisson(20)
        clicks = int(searches * np.random.uniform(0.1, 0.5))
        conversions = int(clicks * np.random.uniform(0, 0.3))
        
        days_inactive = np.random.exponential(30)
        lifetime_value = conversions * np.random.uniform(100, 500)
        
        features = {
            'user_id': f'user_{i}',
            'sessions_7d': sessions_7d,
            'sessions_30d': sessions_30d,
            'sessions_90d': sessions_90d,
            'searches_total': searches,
            'clicks_total': clicks,
            'conversions_total': conversions,
            'search_to_click_ratio': clicks / max(searches, 1),
            'click_to_conversion_ratio': conversions / max(clicks, 1),
            'avg_session_duration_mins': np.random.uniform(5, 45),
            'days_since_last_activity': days_inactive,
            'lifetime_value': lifetime_value,
            'unique_destinations_searched': np.random.randint(1, 15),
            'mobile_session_ratio': np.random.uniform(0, 1),
            'weekend_session_ratio': np.random.uniform(0.2, 0.4),
        }
        
        # Churn probability based on features
        # High churn: inactive, low engagement, no conversions
        churn_score = (
            0.3 * min(days_inactive / 60, 1) +  # Inactivity
            0.2 * (1 - min(sessions_7d / 5, 1)) +  # Low recent activity
            0.2 * (1 - features['search_to_click_ratio']) +  # Low engagement
            0.15 * (1 if conversions == 0 else 0) +  # No conversions
            0.15 * np.random.uniform(0, 0.5)  # Random noise
        )
        
        features['churned'] = 1 if churn_score > 0.5 else 0
        data.append(features)
    
    return pd.DataFrame(data)


def train_churn(
    duckdb_path: str = "/data/searchflow.duckdb",
    model_path: str = "./models/churn",
    n_users: int = 10000,
):
    """Train and save the churn prediction model."""
    # Configure MLflow
    tracking_uri = os.environ.get("MLFLOW_TRACKING_URI", "http://localhost:5000")
    mlflow.set_tracking_uri(tracking_uri)
    mlflow.set_experiment("churn-prediction")
    mlflow.xgboost.autolog()

    print("=" * 50)
    print("Training Churn Prediction Model")
    print("=" * 50)

    # Generate training data
    print("\n[1/4] Generating user features...")
    df = generate_synthetic_churn_data(n_users)
    
    print(f"  Total users: {len(df):,}")
    print(f"  Churned: {df['churned'].sum():,} ({df['churned'].mean():.1%})")
    print(f"  Active: {(~df['churned'].astype(bool)).sum():,}")
    
    # Prepare features
    feature_cols = [
        'sessions_7d', 'sessions_30d', 'sessions_90d',
        'searches_total', 'clicks_total', 'conversions_total',
        'search_to_click_ratio', 'click_to_conversion_ratio',
        'avg_session_duration_mins', 'days_since_last_activity',
        'lifetime_value', 'unique_destinations_searched',
        'mobile_session_ratio', 'weekend_session_ratio'
    ]
    
    X = df[feature_cols]
    y = df['churned']
    
    # Split data
    print("\n[2/4] Splitting data...")
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )
    print(f"  Train: {len(X_train):,}")
    print(f"  Test: {len(X_test):,}")
    
    # Train model with MLflow tracking
    print("\n[3/4] Training XGBoost model...")

    with mlflow.start_run():
        predictor = ChurnPredictor(
            n_estimators=100,
            max_depth=6,
            learning_rate=0.1
        )
        predictor.fit(X_train, y_train, eval_set=(X_test, y_test))

        # Evaluate
        print("\n[4/4] Evaluating model...")
        metrics = predictor.evaluate(X_test, y_test)

        # Log custom metrics
        mlflow.log_metrics({
            "auc": float(metrics.auc),
            "accuracy": float(metrics.accuracy),
            "precision": float(metrics.precision),
            "recall": float(metrics.recall),
            "f1": float(metrics.f1),
        })

        # Log data stats
        mlflow.log_params({
            "n_users": len(df),
            "n_train": len(X_train),
            "n_test": len(X_test),
            "churn_rate": round(float(df["churned"].mean()), 4),
        })

        print(f"\n  AUC: {metrics.auc:.2%}")
        print(f"  Accuracy: {metrics.accuracy:.2%}")
        print(f"  Precision: {metrics.precision:.2%}")
        print(f"  Recall: {metrics.recall:.2%}")
        print(f"  F1: {metrics.f1:.2%}")

        # Feature importance
        print("\n  Top Feature Importance:")
        importance = predictor.get_feature_importance()
        for _, row in importance.head(5).iterrows():
            print(f"  {row['feature']}: {row['importance']:.3f}")

        # Log feature importance as artifact
        importance_path = os.path.join(tempfile.mkdtemp(), "feature_importance.json")
        importance.head(10).to_json(importance_path, orient="records", indent=2)
        mlflow.log_artifact(importance_path)

        # Log SHAP summary plot
        try:
            import shap
            import matplotlib
            matplotlib.use("Agg")
            import matplotlib.pyplot as plt

            explainer = shap.TreeExplainer(predictor.model)
            X_test_scaled = predictor.scaler.transform(X_test)
            shap_values = explainer.shap_values(X_test_scaled)
            shap.summary_plot(shap_values, X_test, feature_names=feature_cols, show=False)
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
            "n_users": len(df),
            "n_train": len(X_train),
            "n_test": len(X_test),
            "churn_rate": round(float(df["churned"].mean()), 4),
            "auc": round(float(metrics.auc), 4),
            "accuracy": round(float(metrics.accuracy), 4),
            "precision": round(float(metrics.precision), 4),
            "recall": round(float(metrics.recall), 4),
            "f1": round(float(metrics.f1), 4),
            "n_estimators": 100,
            "max_depth": 6,
            "learning_rate": 0.1,
            "top_features": [
                {"feature": row["feature"], "importance": round(float(row["importance"]), 4)}
                for _, row in importance.head(5).iterrows()
            ],
        }
        with open(os.path.join(results_dir, "churn_results.json"), "w") as f:
            json.dump(results, f, indent=2)

        print(f"\n  Churn model trained successfully!")
        print(f"   AUC: {metrics.auc:.2%}")

        # Sample prediction with SHAP
        print("\n  Sample Prediction with SHAP Explanation:")
        sample_user = df.iloc[0]
        sample_features = {col: sample_user[col] for col in feature_cols}
        prediction = predictor.predict("sample_user", sample_features)

        print(f"  User: sample_user")
        print(f"  Churn Probability: {prediction.churn_probability:.1%}")
        print(f"  Risk Level: {prediction.risk_level}")
        print(f"  Top Factors:")
        for factor in prediction.top_factors[:3]:
            direction = "+" if factor['direction'] == 'increases' else "-"
            print(f"    {direction} {factor['feature']}: {factor['impact']:.3f}")

    return predictor, metrics


if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser()
    parser.add_argument("--duckdb-path", default="/data/searchflow.duckdb")
    parser.add_argument("--model-path", default="./models/churn")
    args = parser.parse_args()
    
    train_churn(args.duckdb_path, args.model_path)
