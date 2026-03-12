"""Pytest conftest: ensure ml_engine/src is importable."""

import sys
from pathlib import Path

import pytest

_component = str(Path(__file__).resolve().parent.parent)
if _component not in sys.path:
    # Remove any other component's src from cache to avoid collisions
    for key in list(sys.modules.keys()):
        if key == "src" or key.startswith("src."):
            del sys.modules[key]
    sys.path.insert(0, _component)


@pytest.fixture
def mlflow_tmp(tmp_path):
    """Set MLflow tracking URI to a temp directory for isolated test runs."""
    import mlflow

    tracking_uri = str(tmp_path / "mlruns")
    mlflow.set_tracking_uri(tracking_uri)
    yield tracking_uri
