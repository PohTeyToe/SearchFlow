"""
SearchFlow Model Training DAG

Orchestrates weekly retraining of all ML models (churn, sentiment,
recommendation) with MLflow experiment tracking. Runs training scripts
inside the ml-engine container via docker exec.

Schedule: Weekly on Sundays at midnight (0 0 * * 0)
"""

from datetime import datetime, timedelta

from airflow import DAG
from airflow.operators.bash import BashOperator

default_args = {
    "owner": "searchflow",
    "depends_on_past": False,
    "email_on_failure": False,
    "email_on_retry": False,
    "retries": 2,
    "retry_delay": timedelta(minutes=5),
}

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

    train_churn = BashOperator(
        task_id="train_churn",
        bash_command=(
            "docker exec -e MLFLOW_TRACKING_URI=http://mlflow:5000 "
            "searchflow-ml-engine python -m src.training.train_churn"
        ),
    )

    train_sentiment = BashOperator(
        task_id="train_sentiment",
        bash_command=(
            "docker exec -e MLFLOW_TRACKING_URI=http://mlflow:5000 "
            "searchflow-ml-engine python -m src.training.train_sentiment"
        ),
    )

    train_recommender = BashOperator(
        task_id="train_recommender",
        bash_command=(
            "docker exec -e MLFLOW_TRACKING_URI=http://mlflow:5000 "
            "searchflow-ml-engine python -m src.training.train_recommender"
        ),
    )

    train_churn >> train_sentiment >> train_recommender
