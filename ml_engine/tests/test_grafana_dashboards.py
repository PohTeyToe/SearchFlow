"""Tests for Grafana dashboard JSON files."""

import json
from pathlib import Path

import pytest

PROJECT_ROOT = Path(__file__).parent.parent.parent
DASHBOARD_DIR = PROJECT_ROOT / "monitoring" / "grafana" / "provisioning" / "dashboards"
EXPECTED_DASHBOARDS = [
    "pipeline-health.json",
    "ml-serving.json",
    "kafka-metrics.json",
    "system-overview.json",
]


def test_all_expected_dashboard_files_exist():
    for name in EXPECTED_DASHBOARDS:
        assert (DASHBOARD_DIR / name).exists(), f"Missing dashboard: {name}"


def test_dashboard_files_are_valid_json():
    for name in EXPECTED_DASHBOARDS:
        path = DASHBOARD_DIR / name
        with open(path) as f:
            json.load(f)  # Raises on invalid JSON


def test_dashboards_have_required_fields():
    for name in EXPECTED_DASHBOARDS:
        with open(DASHBOARD_DIR / name) as f:
            dash = json.load(f)
        assert isinstance(dash.get("title"), str), f"{name} missing title"
        assert isinstance(dash.get("uid"), str), f"{name} missing uid"
        assert isinstance(dash.get("panels"), list), f"{name} missing panels"
        assert dash.get("schemaVersion", 0) >= 36, f"{name} schemaVersion too low"


def test_dashboard_uids_are_unique():
    uids = []
    for name in EXPECTED_DASHBOARDS:
        with open(DASHBOARD_DIR / name) as f:
            dash = json.load(f)
        uids.append(dash["uid"])
    assert len(uids) == len(set(uids)), f"Duplicate UIDs: {uids}"


def test_dashboards_reference_prometheus_datasource():
    for name in EXPECTED_DASHBOARDS:
        with open(DASHBOARD_DIR / name) as f:
            content = f.read()
        assert "prometheus" in content.lower(), f"{name} doesn't reference Prometheus"


def test_pipeline_health_has_airflow_panels():
    with open(DASHBOARD_DIR / "pipeline-health.json") as f:
        content = f.read()
    assert "airflow" in content.lower()


def test_ml_serving_has_fastapi_panels():
    with open(DASHBOARD_DIR / "ml-serving.json") as f:
        content = f.read()
    assert "http_request" in content.lower()


def test_kafka_dashboard_has_consumer_lag_panel():
    with open(DASHBOARD_DIR / "kafka-metrics.json") as f:
        content = f.read()
    assert "kafka_consumergroup_lag" in content
