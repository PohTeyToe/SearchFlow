"""Tests for observability configuration files."""

import json
from pathlib import Path

import pytest
import yaml


PROJECT_ROOT = Path(__file__).parent.parent.parent


def test_prometheus_config_is_valid_yaml():
    path = PROJECT_ROOT / "monitoring" / "prometheus" / "prometheus.yml"
    assert path.exists(), f"{path} does not exist"
    with open(path) as f:
        config = yaml.safe_load(f)
    assert isinstance(config, dict)


def test_prometheus_config_has_scrape_targets():
    path = PROJECT_ROOT / "monitoring" / "prometheus" / "prometheus.yml"
    with open(path) as f:
        config = yaml.safe_load(f)
    jobs = {sc["job_name"] for sc in config["scrape_configs"]}
    assert "prometheus" in jobs
    assert "ml-engine" in jobs
    assert "statsd-exporter" in jobs
    assert "kafka-exporter" in jobs


def test_grafana_datasources_config_defines_prometheus_and_loki():
    path = PROJECT_ROOT / "monitoring" / "grafana" / "provisioning" / "datasources" / "datasources.yml"
    assert path.exists(), f"{path} does not exist"
    with open(path) as f:
        config = yaml.safe_load(f)
    names = {ds["name"] for ds in config["datasources"]}
    assert "Prometheus" in names
    assert "Loki" in names


def test_loki_config_is_valid_yaml():
    path = PROJECT_ROOT / "monitoring" / "loki" / "loki-config.yml"
    assert path.exists(), f"{path} does not exist"
    with open(path) as f:
        config = yaml.safe_load(f)
    assert isinstance(config, dict)
    assert config.get("auth_enabled") is False


def test_promtail_config_is_valid_yaml():
    path = PROJECT_ROOT / "monitoring" / "promtail" / "config.yml"
    assert path.exists(), f"{path} does not exist"
    with open(path) as f:
        config = yaml.safe_load(f)
    assert isinstance(config, dict)
    assert "scrape_configs" in config


def test_grafana_dashboard_provider_config():
    path = PROJECT_ROOT / "monitoring" / "grafana" / "provisioning" / "dashboards" / "dashboard.yml"
    assert path.exists(), f"{path} does not exist"
    with open(path) as f:
        config = yaml.safe_load(f)
    providers = config["providers"]
    assert len(providers) >= 1
    assert providers[0]["options"]["path"] == "/etc/grafana/provisioning/dashboards"
