"""Tests for documentation files."""

from pathlib import Path

import pytest


PROJECT_ROOT = Path(__file__).parent.parent


def test_incident_runbook_exists():
    assert (PROJECT_ROOT / "docs" / "INCIDENT_RUNBOOK.md").exists()


def test_incident_runbook_contains_decision_trees():
    content = (PROJECT_ROOT / "docs" / "INCIDENT_RUNBOOK.md").read_text()
    assert "kafka" in content.lower() and "consumer lag" in content.lower()
    assert "model accuracy" in content.lower() or "accuracy drop" in content.lower()
    assert "sla" in content.lower()
    assert "error rate" in content.lower() or "5xx" in content.lower()
    assert "freshness" in content.lower()


def test_incident_runbook_has_minimum_length():
    content = (PROJECT_ROOT / "docs" / "INCIDENT_RUNBOOK.md").read_text()
    assert len(content) >= 3000, f"Runbook too short: {len(content)} chars"


def test_incident_runbook_references_tooling():
    content = (PROJECT_ROOT / "docs" / "INCIDENT_RUNBOOK.md").read_text()
    assert "grafana" in content.lower()
    assert "prometheus" in content.lower()
    assert "loki" in content.lower()


def test_scale_doc_exists():
    assert (PROJECT_ROOT / "docs" / "SCALE.md").exists()


def test_decisions_doc_exists():
    assert (PROJECT_ROOT / "docs" / "DECISIONS.md").exists()
