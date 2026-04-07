"""Tests for Airflow SLA configuration on DAG tasks."""

import sys
from datetime import timedelta
from pathlib import Path
from unittest.mock import patch

import pytest


# We need to mock Airflow imports since Airflow isn't installed in test env
# Instead, parse the DAG files and check for sla in default_args

DAG_DIR = Path(__file__).parent.parent / "dags"


def _read_dag_file(name: str) -> str:
    return (DAG_DIR / name).read_text()


def test_ingestion_dag_has_sla():
    content = _read_dag_file("ingestion_dag.py")
    assert "'sla'" in content or '"sla"' in content
    assert "timedelta(minutes=5)" in content


def test_transformation_dag_has_sla():
    content = _read_dag_file("transformation_dag.py")
    assert "'sla'" in content or '"sla"' in content
    assert "timedelta(minutes=10)" in content


def test_reverse_etl_dag_has_sla():
    content = _read_dag_file("reverse_etl_dag.py")
    assert "'sla'" in content or '"sla"' in content
    assert "timedelta(minutes=15)" in content


def test_training_dag_has_sla():
    content = _read_dag_file("training_dag.py")
    assert "'sla'" in content or '"sla"' in content
    assert "timedelta(minutes=30)" in content


def test_monitoring_dag_has_sla():
    content = _read_dag_file("monitoring_dag.py")
    assert "'sla'" in content or '"sla"' in content
    assert "timedelta(minutes=20)" in content
