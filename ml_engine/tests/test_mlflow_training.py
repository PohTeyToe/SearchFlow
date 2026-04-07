"""Tests for MLflow experiment tracking integration in training scripts."""

import os
from unittest.mock import patch

import mlflow
import pandas as pd
import pytest
from mlflow import MlflowClient


@pytest.fixture
def mlflow_tmp(tmp_path):
    """Set MLflow tracking URI to a temp directory for isolated test runs."""
    tracking_uri = (tmp_path / "mlruns").as_uri()
    mlflow.set_tracking_uri(tracking_uri)
    yield tracking_uri


@pytest.fixture
def model_path(tmp_path):
    """Temporary model output directory."""
    return str(tmp_path / "models")


# ---------------------------------------------------------------
# Churn Model MLflow Tests
# ---------------------------------------------------------------


class TestMLflowChurnIntegration:
    """Test MLflow tracking in churn model training."""

    @pytest.fixture(autouse=True)
    def _mock_hotel_data(self):
        """Mock the hotel data loading to avoid needing the CSV in tests."""
        import numpy as np
        rng = np.random.RandomState(42)
        n = 200
        mock_df = pd.DataFrame({
            "lead_time": rng.randint(0, 400, n),
            "stays_in_weekend_nights": rng.randint(0, 4, n),
            "stays_in_week_nights": rng.randint(0, 10, n),
            "adr": rng.uniform(30, 300, n).round(2),
            "is_repeated_guest": rng.randint(0, 2, n),
            "previous_cancellations": rng.randint(0, 5, n),
            "previous_bookings_not_canceled": rng.randint(0, 20, n),
            "booking_changes": rng.randint(0, 5, n),
            "total_of_special_requests": rng.randint(0, 5, n),
            "days_in_waiting_list": rng.randint(0, 50, n),
            "adults": rng.randint(1, 4, n),
            "children": rng.choice([0, 0, 0, 1, 2], n).astype(float),
            "babies": rng.choice([0, 0, 0, 0, 1], n),
            "deposit_type": rng.choice(["No Deposit", "Non Refund", "Refundable"], n),
            "market_segment": rng.choice(["Online TA", "Direct", "Corporate", "Groups"], n),
            "customer_type": rng.choice(["Transient", "Contract", "Group", "Transient-Party"], n),
            "is_canceled": rng.randint(0, 2, n),
            "agent": rng.choice([0, 1, 14, 40], n).astype(float),
            "company": np.zeros(n),
        })
        with patch("src.training.train_churn.load_hotel_bookings", return_value=mock_df):
            yield

    def test_creates_experiment(self, mlflow_tmp, model_path):
        from src.training.train_churn import train_churn

        train_churn(model_path=model_path)

        experiment = mlflow.get_experiment_by_name("churn-prediction")
        assert experiment is not None

    def test_logs_hyperparameters(self, mlflow_tmp, model_path):
        from src.training.train_churn import train_churn

        train_churn(model_path=model_path)

        runs = mlflow.search_runs(experiment_names=["churn-prediction"])
        assert len(runs) >= 1
        run = runs.iloc[0]
        # XGBoost autolog logs as learning_rate and max_depth
        assert "params.learning_rate" in run.index
        assert "params.max_depth" in run.index

    def test_logs_evaluation_metrics(self, mlflow_tmp, model_path):
        from src.training.train_churn import train_churn

        train_churn(model_path=model_path)

        runs = mlflow.search_runs(experiment_names=["churn-prediction"])
        run = runs.iloc[0]
        # Check custom metrics logged
        assert run.get("metrics.auc") is not None or run.get("metrics.accuracy") is not None

    def test_logs_shap_artifact(self, mlflow_tmp, model_path):
        from src.training.train_churn import train_churn

        train_churn(model_path=model_path)

        runs = mlflow.search_runs(experiment_names=["churn-prediction"])
        run_id = runs.iloc[0]["run_id"]
        client = MlflowClient()
        artifacts = [a.path for a in client.list_artifacts(run_id)]
        # Check that some artifact with 'shap' in name exists
        shap_artifacts = [a for a in artifacts if "shap" in a.lower()]
        assert len(shap_artifacts) > 0

    def test_tracking_uri_from_env(self, mlflow_tmp, model_path):
        """MLflow tracking URI should be configurable via environment variable."""
        from src.training.train_churn import train_churn

        os.environ["MLFLOW_TRACKING_URI"] = mlflow_tmp
        train_churn(model_path=model_path)
        assert mlflow.get_tracking_uri().rstrip("/") == mlflow_tmp.rstrip("/")
        os.environ.pop("MLFLOW_TRACKING_URI", None)


# ---------------------------------------------------------------
# Sentiment Model MLflow Tests
# ---------------------------------------------------------------


class TestMLflowSentimentIntegration:
    """Test MLflow tracking in sentiment model training."""

    def test_creates_experiment(self, mlflow_tmp, model_path):
        from src.training.train_sentiment import train_sentiment

        train_sentiment(n_samples=500, use_bert=False, model_path=model_path)

        experiment = mlflow.get_experiment_by_name("sentiment-analysis")
        assert experiment is not None

    def test_logs_accuracy(self, mlflow_tmp, model_path):
        from src.training.train_sentiment import train_sentiment

        train_sentiment(n_samples=500, use_bert=False, model_path=model_path)

        runs = mlflow.search_runs(experiment_names=["sentiment-analysis"])
        assert len(runs) >= 1
        run = runs.iloc[0]
        assert run.get("metrics.accuracy") is not None

    def test_logs_model_artifact(self, mlflow_tmp, model_path):
        from src.training.train_sentiment import train_sentiment

        train_sentiment(n_samples=500, use_bert=False, model_path=model_path)

        runs = mlflow.search_runs(experiment_names=["sentiment-analysis"])
        run_id = runs.iloc[0]["run_id"]
        client = MlflowClient()
        artifacts = [a.path for a in client.list_artifacts(run_id)]
        assert len(artifacts) > 0


# ---------------------------------------------------------------
# Recommendation Model MLflow Tests
# ---------------------------------------------------------------


class TestMLflowRecommenderIntegration:
    """Test MLflow tracking in recommender model training."""

    def test_creates_experiment(self, mlflow_tmp, model_path):
        from src.training.train_recommender import train_recommender

        train_recommender(model_path=model_path)

        experiment = mlflow.get_experiment_by_name("recommendations")
        assert experiment is not None

    def test_logs_metrics(self, mlflow_tmp, model_path):
        from src.training.train_recommender import train_recommender

        train_recommender(model_path=model_path)

        runs = mlflow.search_runs(experiment_names=["recommendations"])
        assert len(runs) >= 1
        run = runs.iloc[0]
        assert run.get("metrics.precision_at_10") is not None

    def test_logs_model_artifact(self, mlflow_tmp, model_path):
        from src.training.train_recommender import train_recommender

        train_recommender(model_path=model_path)

        runs = mlflow.search_runs(experiment_names=["recommendations"])
        run_id = runs.iloc[0]["run_id"]
        client = MlflowClient()
        artifacts = [a.path for a in client.list_artifacts(run_id)]
        assert len(artifacts) > 0
