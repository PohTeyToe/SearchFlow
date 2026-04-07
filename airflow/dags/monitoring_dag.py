"""
Airflow DAG for automated ML model drift monitoring.

Runs daily drift checks against the hotel bookings reference data,
evaluates whether drift exceeds thresholds, and conditionally triggers
model retraining via the searchflow_training DAG.
"""

import json
import os
import sys
from datetime import datetime, timedelta
from pathlib import Path

from airflow import DAG
from airflow.operators.python import PythonOperator, BranchPythonOperator
from airflow.operators.empty import EmptyOperator
from airflow.operators.trigger_dagrun import TriggerDagRunOperator


default_args = {
    "owner": "ml-team",
    "retries": 1,
    "retry_delay": timedelta(minutes=5),
    "sla": timedelta(minutes=20),
}

REPORT_DIR = os.getenv("DRIFT_REPORT_DIR", "/opt/airflow/reports/drift")
DATA_PATH = os.getenv("HOTEL_DATA_PATH", "/data/raw/hotel_bookings.csv")


def _check_drift(**context):
    """Run drift detection against reference data."""
    import pandas as pd

    sys.path.insert(0, "/opt/airflow/ml_engine")
    from src.models.churn import engineer_features
    from src.monitoring.drift import DriftDetector

    # Load reference data
    raw = pd.read_csv(DATA_PATH)
    raw["children"] = raw["children"].fillna(0)
    total_guests = raw["adults"] + raw["children"] + raw["babies"]
    raw = raw[total_guests > 0].reset_index(drop=True)

    # Use most recent 20% as "current" (sorted by date proxy)
    raw_sorted = raw.sort_values(
        ["arrival_date_year", "arrival_date_week_number"]
    ).reset_index(drop=True)
    split = int(len(raw_sorted) * 0.8)
    ref_raw = raw_sorted.iloc[:split]
    cur_raw = raw_sorted.iloc[split:]

    ref_features = engineer_features(ref_raw).drop(columns=["is_canceled"])
    cur_features = engineer_features(cur_raw).drop(columns=["is_canceled"])

    detector = DriftDetector(share_threshold=0.3)
    os.makedirs(REPORT_DIR, exist_ok=True)
    report_path = os.path.join(REPORT_DIR, "latest_drift_report.html")

    result = detector.check(
        ref_features, cur_features,
        save_report=True, report_path=report_path,
    )

    # Save result JSON for API endpoint
    result_dict = result.to_dict()
    result_path = os.path.join(REPORT_DIR, "latest_result.json")
    with open(result_path, "w") as f:
        json.dump(result_dict, f, indent=2)

    # Log to MLflow
    try:
        detector.log_to_mlflow(result, report_path=report_path)
    except Exception:
        pass  # MLflow may not be available

    context["ti"].xcom_push(key="drift_result", value=result_dict)


def _evaluate_drift(**context):
    """Decide whether to trigger retraining based on drift results."""
    result = context["ti"].xcom_pull(task_ids="check_drift", key="drift_result")
    if result and result.get("drift_detected") and result.get("drift_score", 0) > 0.3:
        return "trigger_retrain"
    return "skip_retrain"


with DAG(
    dag_id="searchflow_model_monitoring",
    default_args=default_args,
    description="Daily ML model drift monitoring with conditional retraining",
    schedule="0 6 * * *",
    start_date=datetime(2024, 1, 1),
    catchup=False,
    tags=["monitoring", "ml"],
) as dag:

    check_drift = PythonOperator(
        task_id="check_drift",
        python_callable=_check_drift,
    )

    evaluate_drift = BranchPythonOperator(
        task_id="evaluate_drift",
        python_callable=_evaluate_drift,
    )

    trigger_retrain = TriggerDagRunOperator(
        task_id="trigger_retrain",
        trigger_dag_id="searchflow_training",
        conf={"trigger_reason": "drift_detected"},
        trigger_rule="none_failed",
    )

    skip_retrain = EmptyOperator(
        task_id="skip_retrain",
    )

    check_drift >> evaluate_drift >> [trigger_retrain, skip_retrain]
