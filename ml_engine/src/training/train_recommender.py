"""
Train the hybrid recommendation model.

Loads user interaction data from DuckDB or Booking.com trip sequences,
trains collaborative + content-based models, and evaluates precision@10 + NDCG@10.
"""

import json
import os
import sys
from typing import Optional

import numpy as np
import pandas as pd
from pathlib import Path

import mlflow
import mlflow.sklearn

# Add parent to path
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from src.models.recommendation import HybridRecommender
from src.evaluation.metrics import precision_at_k, recall_at_k, ndcg_at_k


def load_booking_com_trips(data_dir: str) -> Optional[pd.DataFrame]:
    """Load Booking.com MDT trip sequences and convert to interaction pairs.

    Looks for a train_set.csv in the Booking.com dataset clone directory.
    Returns DataFrame with user_id, item_id, rating columns, or None.
    """
    # Check for Booking.com dataset directory structure
    for candidate in [
        os.path.join(data_dir, "booking_com", "data", "train_set.csv"),
        os.path.join(data_dir, "booking_com", "train_set.csv"),
    ]:
        if os.path.exists(candidate):
            df = pd.read_csv(candidate)
            # Booking.com dataset has utrip_id, city_id columns
            if "utrip_id" in df.columns and "city_id" in df.columns:
                rows = []
                for utrip, group in df.groupby("utrip_id"):
                    user_id = str(utrip)
                    for city in group["city_id"].unique():
                        rows.append({
                            "user_id": user_id,
                            "item_id": str(city),
                            "rating": 3.0,  # implicit positive signal
                        })
                return pd.DataFrame(rows)

    # Also check for a simple trips.csv format
    trip_file = os.path.join(data_dir, "trips.csv")
    if os.path.exists(trip_file):
        df = pd.read_csv(trip_file)
        if {"user_id", "city_id"}.issubset(df.columns):
            rows = []
            for _, row in df.iterrows():
                rows.append({
                    "user_id": str(row["user_id"]),
                    "item_id": str(row["city_id"]),
                    "rating": 3.0,
                })
            return pd.DataFrame(rows)

    return None


def load_interaction_data(duckdb_path: str) -> pd.DataFrame:
    """Load user-item interactions from warehouse."""
    import duckdb
    
    conn = duckdb.connect(duckdb_path, read_only=True)
    
    # Get search and click events
    query = """
    SELECT 
        user_id,
        query as item_id,
        CASE 
            WHEN event_type = 'conversion' THEN 5.0
            WHEN event_type = 'click' THEN 3.0
            ELSE 1.0
        END as rating
    FROM (
        SELECT user_id, query, 'search' as event_type
        FROM main_staging.stg_search_events
        WHERE user_id IS NOT NULL
        UNION ALL
        SELECT user_id, result_destination as query, 'click' as event_type
        FROM main_staging.stg_click_events
        WHERE user_id IS NOT NULL
    )
    """
    
    try:
        df = conn.execute(query).fetchdf()
    except:
        # Fallback: generate synthetic data
        df = generate_synthetic_interactions()
    
    conn.close()
    return df


def generate_synthetic_interactions(n_users: int = 5000, n_items: int = 50) -> pd.DataFrame:
    """Generate synthetic interaction data for training."""
    np.random.seed(42)
    
    users = [f"user_{i}" for i in range(n_users)]
    items = [
        "Miami", "Toronto", "NYC", "Los Angeles", "Las Vegas",
        "Cancun", "Vancouver", "Montreal", "Chicago", "Boston",
        "San Francisco", "Seattle", "Denver", "Orlando", "Hawaii",
        "Paris", "London", "Tokyo", "Barcelona", "Rome",
        "flights to Miami", "hotels in NYC", "cheap Vegas deals",
        "Toronto vacation", "LA beach hotels", "Cancun resorts",
        "family vacation Orlando", "ski Denver", "Boston weekend",
        "Chicago downtown", "Seattle coffee tour", "SF tech district"
    ] + [f"destination_{i}" for i in range(n_items - 32)]
    
    interactions = []
    for user in users:
        # Each user has 5-20 interactions
        n_interactions = np.random.randint(5, 21)
        user_items = np.random.choice(items, size=n_interactions, replace=False)
        
        for item in user_items:
            # Rating based on position preference simulation
            rating = np.random.choice([1, 2, 3, 4, 5], p=[0.1, 0.15, 0.25, 0.3, 0.2])
            interactions.append({
                'user_id': user,
                'item_id': item,
                'rating': float(rating)
            })
    
    return pd.DataFrame(interactions)


def generate_item_features(items: list) -> pd.DataFrame:
    """Generate item feature matrix."""
    np.random.seed(42)
    
    features = []
    for item in items:
        features.append({
            'item_id': item,
            'price_level': np.random.uniform(1, 5),
            'popularity': np.random.uniform(0, 1),
            'beach_score': np.random.uniform(0, 1),
            'city_score': np.random.uniform(0, 1),
            'family_friendly': np.random.uniform(0, 1),
            'luxury_score': np.random.uniform(0, 1),
        })
    
    return pd.DataFrame(features)


def train_recommender(
    duckdb_path: str = "/data/searchflow.duckdb",
    model_path: str = "./models/recommendation",
    data_dir: str = "data/raw",
):
    """Train and save the recommendation model."""
    tracking_uri = os.environ.get("MLFLOW_TRACKING_URI", "http://localhost:5000")
    mlflow.set_tracking_uri(tracking_uri)
    mlflow.set_experiment("recommendations")
    mlflow.sklearn.autolog()

    print("=" * 50)
    print("Training Hybrid Recommendation Engine")
    print("=" * 50)

    # Try real data sources in order, fall back to synthetic
    print("\n[1/4] Loading interaction data...")
    data_source = "synthetic"

    # Try Booking.com dataset first
    booking_data = load_booking_com_trips(data_dir)
    if booking_data is not None:
        interactions_df = booking_data
        data_source = "booking_com"
        print(f"  Loaded Booking.com trip data ({len(interactions_df):,} interactions)")
    else:
        # Try DuckDB warehouse
        try:
            interactions_df = load_interaction_data(duckdb_path)
            data_source = "warehouse"
        except Exception:
            print("  Using synthetic data (no real data available)")
            interactions_df = generate_synthetic_interactions()
    
    print(f"  Loaded {len(interactions_df):,} interactions")
    print(f"  Users: {interactions_df['user_id'].nunique():,}")
    print(f"  Items: {interactions_df['item_id'].nunique():,}")
    
    # Generate item features
    print("\n[2/4] Building item features...")
    items = interactions_df['item_id'].unique().tolist()
    items_df = generate_item_features(items)
    feature_cols = ['price_level', 'popularity', 'beach_score', 
                    'city_score', 'family_friendly', 'luxury_score']
    print(f"  Features: {feature_cols}")
    
    # Split data for evaluation
    print("\n[3/4] Training model...")
    
    # Hold out 20% of users for evaluation
    users = interactions_df['user_id'].unique()
    np.random.shuffle(users)
    split_idx = int(len(users) * 0.8)
    train_users = set(users[:split_idx])
    test_users = set(users[split_idx:])
    
    train_df = interactions_df[interactions_df['user_id'].isin(train_users)]
    test_df = interactions_df[interactions_df['user_id'].isin(test_users)]
    
    # Train model with MLflow tracking
    with mlflow.start_run():
        recommender = HybridRecommender(n_factors=50, collab_weight=0.6, content_weight=0.4)
        recommender.fit(train_df, items_df, feature_cols)

        # Evaluate
        print("\n[4/4] Evaluating model...")

        precisions = []
        recalls = []
        ndcgs = []

        for user_id in list(test_users)[:100]:  # Sample for speed
            actual = test_df[
                (test_df['user_id'] == user_id) &
                (test_df['rating'] >= 3)
            ]['item_id'].tolist()

            if not actual:
                continue

            result = recommender.predict(user_id, top_n=10)
            predicted = [r['item_id'] for r in result.recommendations]

            hits = len(set(predicted) & set(actual))
            precisions.append(hits / 10)
            recalls.append(hits / len(actual) if actual else 0)
            ndcgs.append(ndcg_at_k(predicted, actual, k=10))

        avg_precision = np.mean(precisions) if precisions else 0
        avg_recall = np.mean(recalls) if recalls else 0
        avg_ndcg = np.mean(ndcgs) if ndcgs else 0
        precision_10 = avg_precision

        # Log metrics and params
        mlflow.log_metrics({
            "precision_at_10": float(precision_10),
            "recall_at_10": float(avg_recall),
            "ndcg_at_10": float(avg_ndcg),
        })
        mlflow.log_params({
            "n_factors": 50,
            "collab_weight": 0.6,
            "content_weight": 0.4,
            "data_source": data_source,
            "n_users_train": len(train_users),
            "n_users_test": len(test_users),
            "n_interactions": len(interactions_df),
            "n_items": int(interactions_df["item_id"].nunique()),
        })

        # Log model artifact
        try:
            mlflow.sklearn.log_model(recommender, "model")
        except Exception:
            pass

        print(f"\n  Precision@10: {precision_10:.2%}")
        print(f"  Recall@10: {avg_recall:.2%}")

        # Save model and training results
        print(f"\n  Saving model to {model_path}...")
        recommender.save(model_path)

        results_dir = os.path.join(os.path.dirname(model_path), "..", "training_results")
        os.makedirs(results_dir, exist_ok=True)
        results = {
            "model": "hybrid_cf_cb",
            "data_source": data_source,
            "n_users_train": len(train_users),
            "n_users_test": len(test_users),
            "n_interactions": len(interactions_df),
            "n_items": int(interactions_df["item_id"].nunique()),
            "precision_at_10": round(float(precision_10), 4),
            "recall_at_10": round(float(avg_recall), 4),
            "ndcg_at_10": round(float(avg_ndcg), 4),
            "n_factors": 50,
            "collab_weight": 0.6,
            "content_weight": 0.4,
        }
        with open(os.path.join(results_dir, "recommender_results.json"), "w") as f:
            json.dump(results, f, indent=2)

        print(f"\n  Recommendation model trained successfully!")
        print(f"   Precision@10: {precision_10:.2%}")

    return recommender, precision_10


if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser()
    parser.add_argument("--duckdb-path", default="/data/searchflow.duckdb")
    parser.add_argument("--model-path", default="./models/recommendation")
    parser.add_argument("--data-dir", default="data/raw")
    args = parser.parse_args()

    train_recommender(args.duckdb_path, args.model_path, args.data_dir)
