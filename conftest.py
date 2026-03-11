"""Root conftest: configure per-component test isolation.

Each component (event_generator, ml_engine, reverse_etl) has its own src/
package. We use pytest_collect_modifyitems to ensure correct sys.path setup
when running all tests together from the project root.
"""

import sys
from pathlib import Path


def pytest_collectstart(collector):
    """Before collecting each test directory, set up the correct sys.path."""
    path = str(getattr(collector, "path", getattr(collector, "fspath", "")))
    root = str(Path(__file__).resolve().parent)

    for component in ("event_generator", "ml_engine", "reverse_etl", "airflow"):
        component_dir = str(Path(root) / component)
        if component_dir in path:
            # Purge stale src.* modules from other components
            for key in list(sys.modules.keys()):
                if key == "src" or key.startswith("src."):
                    del sys.modules[key]
            # Ensure this component's directory is first on sys.path
            if component_dir in sys.path:
                sys.path.remove(component_dir)
            sys.path.insert(0, component_dir)
            break
