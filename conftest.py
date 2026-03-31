"""Root conftest: configure per-component test isolation.

Each component (event_generator, ml_engine, reverse_etl) has its own src/
package.  We switch sys.path and cache/restore src.* modules at both
collection time (so imports work) and test-setup time (so the correct
modules are active when tests actually run).
"""

import sys
from pathlib import Path

_current_component = None
_component_modules: dict = {}


def _switch_component(path_str: str):
    """Switch to the component that owns the given path."""
    global _current_component
    root = str(Path(__file__).resolve().parent)

    for component in ("event_generator", "ml_engine", "reverse_etl", "airflow", "search_assistant"):
        component_dir = str(Path(root) / component)
        if component_dir in path_str:
            if _current_component == component_dir:
                return
            # Save current component's src.* modules
            if _current_component is not None:
                _component_modules[_current_component] = {
                    k: v for k, v in sys.modules.items()
                    if k == "src" or k.startswith("src.")
                }
            _current_component = component_dir
            # Remove all src.* modules
            for key in list(sys.modules.keys()):
                if key == "src" or key.startswith("src."):
                    del sys.modules[key]
            # Restore cached modules for the target component
            if component_dir in _component_modules:
                sys.modules.update(_component_modules[component_dir])
            # Ensure this component's directory is first on sys.path
            if component_dir in sys.path:
                sys.path.remove(component_dir)
            sys.path.insert(0, component_dir)
            break


def pytest_collectstart(collector):
    """During collection, switch to the correct component for imports."""
    path = str(getattr(collector, "path", getattr(collector, "fspath", "")))
    _switch_component(path)


def pytest_runtest_setup(item):
    """Before each test, ensure the correct component's modules are active."""
    _switch_component(str(item.path))
