"""Drift detection module using Evidently AI.

Compares reference (training) data distributions against current data
for the 14 churn model features. Produces structured results, HTML
reports, and integrates with MLflow for experiment tracking.

Compatible with Evidently 0.7+ API.
"""

import json
import os
from dataclasses import dataclass, asdict
from datetime import datetime, timezone
from typing import Optional

import pandas as pd
from evidently import Report
from evidently.presets import DataDriftPreset


@dataclass
class DriftResult:
    """Structured result from drift detection."""
    drift_detected: bool
    drift_score: float
    share_of_drifted_columns: float
    n_drifted_columns: int
    n_columns: int
    per_feature: dict
    timestamp: str

    def to_dict(self) -> dict:
        """Return JSON-serializable dictionary."""
        d = asdict(self)
        return json.loads(json.dumps(d, default=str))


class DriftDetector:
    """Detect data drift using Evidently AI.

    Uses statistical tests (K-S, chi-square) to compare reference
    and current data distributions for all features.
    """

    def __init__(self, share_threshold: float = 0.5):
        self.share_threshold = share_threshold

    def check(
        self,
        reference: pd.DataFrame,
        current: pd.DataFrame,
        save_report: bool = False,
        report_path: Optional[str] = None,
    ) -> DriftResult:
        """Run Evidently DataDriftPreset on reference vs current data.

        Returns structured DriftResult with per-feature drift status.
        """
        report = Report([DataDriftPreset(drift_share=self.share_threshold)])
        snapshot = report.run(reference, current)

        if save_report and report_path:
            os.makedirs(os.path.dirname(report_path) or ".", exist_ok=True)
            snapshot.save_html(report_path)

        # Parse metrics from snapshot dict
        metrics_list = snapshot.dict().get("metrics", [])

        n_drifted = 0
        drift_share = 0.0
        per_feature = {}
        n_columns = 0

        for metric in metrics_list:
            name = metric.get("metric_name", "")
            value = metric.get("value")

            if "DriftedColumnsCount" in name:
                v = value if isinstance(value, dict) else {}
                n_drifted = int(v.get("count", 0))
                drift_share = float(v.get("share", 0))

            elif "ValueDrift" in name:
                n_columns += 1
                # Extract column name from metric_name string
                col_name = _extract_column_name(name)
                p_value = float(value) if isinstance(value, (int, float)) else 0.0
                drifted = p_value < 0.05  # standard significance threshold
                per_feature[col_name] = {
                    "drift_detected": drifted,
                    "p_value": p_value,
                    "drift_score": p_value,
                }

        if n_columns == 0:
            n_columns = len(reference.columns)

        drift_detected = drift_share > self.share_threshold

        return DriftResult(
            drift_detected=drift_detected,
            drift_score=drift_share,
            share_of_drifted_columns=drift_share,
            n_drifted_columns=n_drifted,
            n_columns=n_columns,
            per_feature=per_feature,
            timestamp=datetime.now(timezone.utc).isoformat(),
        )

    def log_to_mlflow(
        self,
        result: DriftResult,
        report_path: Optional[str] = None,
        experiment_name: str = "model-monitoring",
    ) -> str:
        """Log drift result to MLflow."""
        import mlflow

        tracking_uri = os.environ.get("MLFLOW_TRACKING_URI", "http://localhost:5000")
        mlflow.set_tracking_uri(tracking_uri)
        mlflow.set_experiment(experiment_name)

        with mlflow.start_run(run_name=f"drift-check-{result.timestamp[:19]}") as run:
            mlflow.log_metric("drift_score", result.drift_score)
            mlflow.log_metric("share_of_drifted_columns", result.share_of_drifted_columns)
            mlflow.log_metric("drift_detected", 1 if result.drift_detected else 0)
            mlflow.log_metric("n_drifted_columns", result.n_drifted_columns)

            for feat_name, feat_data in result.per_feature.items():
                mlflow.log_metric(
                    f"{feat_name}_drift",
                    1 if feat_data.get("drift_detected", False) else 0,
                )

            mlflow.log_param("n_columns", result.n_columns)
            mlflow.log_param("share_threshold", self.share_threshold)

            if report_path and os.path.exists(report_path):
                mlflow.log_artifact(report_path)

            return run.info.run_id


def _extract_column_name(metric_name: str) -> str:
    """Extract column name from Evidently metric_name string.

    Example: 'ValueDrift(column=lead_time,method=K-S p_value,threshold=0.05)'
    -> 'lead_time'
    """
    if "column=" in metric_name:
        start = metric_name.index("column=") + len("column=")
        end = metric_name.index(",", start)
        return metric_name[start:end]
    return metric_name
