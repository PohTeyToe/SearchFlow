#!/usr/bin/env python3
"""Run all 4 drift simulation scenarios against hotel booking data.

Generates Evidently HTML reports and optionally logs to MLflow.

Usage:
    python scripts/simulate_drift.py
    python scripts/simulate_drift.py --no-mlflow
    python scripts/simulate_drift.py --data-path data/raw/hotel_bookings.csv
"""

import argparse
import os
import sys
from pathlib import Path

import pandas as pd

# Add ml_engine to path
sys.path.insert(0, str(Path(__file__).parent.parent / "ml_engine"))

from src.models.churn import engineer_features
from src.monitoring.drift import DriftDetector
from src.monitoring.scenarios import SCENARIOS


def main():
    parser = argparse.ArgumentParser(description="Simulate drift scenarios")
    parser.add_argument("--data-path", default="data/raw/hotel_bookings.csv")
    parser.add_argument("--report-dir", default="reports/drift")
    parser.add_argument("--no-mlflow", action="store_true")
    args = parser.parse_args()

    # Load reference data
    print("Loading reference data...")
    raw = pd.read_csv(args.data_path)
    raw["children"] = raw["children"].fillna(0)
    total_guests = raw["adults"] + raw["children"] + raw["babies"]
    raw = raw[total_guests > 0].reset_index(drop=True)

    ref_features = engineer_features(raw)
    print(f"  Reference: {len(ref_features):,} rows, {len(ref_features.columns)} columns")

    os.makedirs(args.report_dir, exist_ok=True)
    detector = DriftDetector(share_threshold=0.3)

    results = []
    for name, scenario_fn in SCENARIOS.items():
        print(f"\n--- {name} scenario ---")

        shifted_raw = scenario_fn(raw)
        shifted_features = engineer_features(shifted_raw)

        report_path = os.path.join(args.report_dir, f"{name}_drift_report.html")
        result = detector.check(
            ref_features.drop(columns=["is_canceled"]),
            shifted_features.drop(columns=["is_canceled"]),
            save_report=True,
            report_path=report_path,
        )

        print(f"  Drift detected: {result.drift_detected}")
        print(f"  Drift score:    {result.drift_score:.2%}")
        print(f"  Drifted cols:   {result.n_drifted_columns}/{result.n_columns}")

        if not args.no_mlflow:
            try:
                run_id = detector.log_to_mlflow(result, report_path=report_path)
                print(f"  MLflow run:     {run_id}")
            except Exception as e:
                print(f"  MLflow logging skipped: {e}")

        results.append((name, result))

    # Summary table
    print("\n" + "=" * 60)
    print(f"{'Scenario':<20} {'Drift?':<8} {'Score':<10} {'Drifted'}")
    print("-" * 60)
    for name, r in results:
        print(f"{name:<20} {'YES' if r.drift_detected else 'no':<8} {r.drift_score:<10.2%} {r.n_drifted_columns}/{r.n_columns}")
    print("=" * 60)


if __name__ == "__main__":
    main()
