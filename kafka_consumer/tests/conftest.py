"""Pytest conftest for kafka_consumer tests."""

import sys
from pathlib import Path

_component = str(Path(__file__).resolve().parent.parent)
if _component not in sys.path:
    for key in list(sys.modules.keys()):
        if key == "src" or key.startswith("src."):
            del sys.modules[key]
    sys.path.insert(0, _component)
