"""
SearchFlow Model Training DAG

Orchestrates weekly retraining of all ML models (churn, sentiment,
recommendation) with MLflow experiment tracking.

Schedule: Weekly on Sundays at midnight (0 0 * * 0)
"""

import sys
from datetime import datetime, timedelta

from airflow.operators.python import PythonOperator

from airflow import DAG

default_args = {
    "owner": "searchflow",
    "depends_on_past": False,
    "email_on_failure": False,
    "email_on_retry": False,
    "retries": 2,
    "retry_delay": timedelta(minutes=5),
    "sla": timedelta(minutes=30),
}


def _train_churn():
    """Train churn prediction model with MLflow tracking."""
    import os
    os.environ.setdefault("MLFLOW_TRACKING_URI", "http://mlflow:5000")
    sys.path.insert(0, "/opt/airflow/ml_engine")
    from src.training.train_churn import train_churn
    train_churn()


def _train_sentiment():
    """Train sentiment analysis model with MLflow tracking."""
    import os
    os.environ.setdefault("MLFLOW_TRACKING_URI", "http://mlflow:5000")
    sys.path.insert(0, "/opt/airflow/ml_engine")
    from src.training.train_sentiment import train_sentiment
    train_sentiment()


def _train_recommender():
    """Train recommendation model with MLflow tracking."""
    import os
    os.environ.setdefault("MLFLOW_TRACKING_URI", "http://mlflow:5000")
    sys.path.insert(0, "/opt/airflow/ml_engine")
    from src.training.train_recommender import train_recommender
    train_recommender()


with DAG(
    dag_id="searchflow_training",
    default_args=default_args,
    description="Weekly ML model retraining with MLflow tracking",
    schedule_interval="0 0 * * 0",
    start_date=datetime(2024, 1, 1),
    catchup=False,
    max_active_runs=1,
    tags=["training", "mlflow", "searchflow"],
) as dag:

    train_churn = PythonOperator(
        task_id="train_churn",
        python_callable=_train_churn,
    )

    train_sentiment = PythonOperator(
        task_id="train_sentiment",
        python_callable=_train_sentiment,
    )

    train_recommender = PythonOperator(
        task_id="train_recommender",
        python_callable=_train_recommender,
    )

    train_churn >> train_sentiment >> train_recommender
