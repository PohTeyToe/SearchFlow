"""Pytest conftest: ensure ml_engine/src is importable."""

import sys
from pathlib import Path

_component = str(Path(__file__).resolve().parent.parent)
if _component not in sys.path:
    # Remove any other component's src from cache to avoid collisions
    for key in list(sys.modules.keys()):
        if key == "src" or key.startswith("src."):
            del sys.modules[key]
    sys.path.insert(0, _component)
