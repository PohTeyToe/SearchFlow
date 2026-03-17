"""DAG integrity tests -- verify every Airflow DAG loads without import errors
and has the expected structure.

Run with: pytest airflow/tests/ -v
Requires: apache-airflow (available in the Docker/CI environment)
"""

import importlib
import sys
from pathlib import Path

import pytest

# Skip entire module if Airflow is not installed (e.g. local dev without venv).
# We check for airflow.models.dag specifically because the project's own
# airflow/ directory can shadow the package at the top-level import.
pytest.importorskip("airflow.models.dag", reason="Airflow not installed -- skipping DAG tests")

# Ensure the dags directory is importable
DAGS_DIR = Path(__file__).resolve().parent.parent / "dags"
sys.path.insert(0, str(DAGS_DIR))


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _load_dag(module_name: str, dag_id: str):
    """Import a DAG module and return the DAG object."""
    mod = importlib.import_module(module_name)
    # The DAG is accessible via the module-level `dag` variable created
    # inside the `with DAG(...) as dag:` block.
    dag = getattr(mod, "dag", None)
    assert dag is not None, f"Module {module_name} has no top-level 'dag' attribute"
    assert dag.dag_id == dag_id
    return dag


# ---------------------------------------------------------------------------
# Ingestion DAG
# ---------------------------------------------------------------------------


class TestIngestionDag:
    @pytest.fixture(autouse=True)
    def _load(self):
        self.dag = _load_dag("ingestion_dag", "searchflow_ingestion")

    def test_import_succeeds(self):
        assert self.dag is not None

    def test_task_count(self):
        # start, 3 ingest tasks, log_metrics, end = 6
        assert len(self.dag.tasks) == 6

    def test_expected_task_ids(self):
        ids = {t.task_id for t in self.dag.tasks}
        assert ids == {
            "start",
            "ingest_search_events",
            "ingest_click_events",
            "ingest_conversion_events",
            "log_metrics",
            "end",
        }

    def test_schedule(self):
        assert self.dag.schedule_interval == "*/5 * * * *"

    def test_no_catchup(self):
        assert self.dag.catchup is False


# ---------------------------------------------------------------------------
# Transformation DAG
# ---------------------------------------------------------------------------


class TestTransformationDag:
    @pytest.fixture(autouse=True)
    def _load(self):
        self.dag = _load_dag("transformation_dag", "searchflow_transformation")

    def test_import_succeeds(self):
        assert self.dag is not None

    def test_task_count(self):
        # start, dbt_deps, staging, intermediate, marts, test, docs, end = 8
        assert len(self.dag.tasks) == 8

    def test_expected_task_ids(self):
        ids = {t.task_id for t in self.dag.tasks}
        assert ids == {
            "start",
            "dbt_deps",
            "dbt_run_staging",
            "dbt_run_intermediate",
            "dbt_run_marts",
            "dbt_test",
            "dbt_docs_generate",
            "end",
        }

    def test_schedule(self):
        assert self.dag.schedule_interval == "0 * * * *"

    def test_no_catchup(self):
        assert self.dag.catchup is False


# ---------------------------------------------------------------------------
# Reverse-ETL DAG
# ---------------------------------------------------------------------------


class TestReverseEtlDag:
    @pytest.fixture(autouse=True)
    def _load(self):
        self.dag = _load_dag("reverse_etl_dag", "searchflow_reverse_etl")

    def test_import_succeeds(self):
        assert self.dag is not None

    def test_task_count(self):
        # start, sync_user_segments, sync_recommendations, log_metrics, end = 5
        assert len(self.dag.tasks) == 5

    def test_expected_task_ids(self):
        ids = {t.task_id for t in self.dag.tasks}
        assert ids == {
            "start",
            "sync_user_segments",
            "sync_recommendations",
            "log_metrics",
            "end",
        }

    def test_schedule(self):
        assert self.dag.schedule_interval == "0 */6 * * *"

    def test_no_catchup(self):
        assert self.dag.catchup is False


# ---------------------------------------------------------------------------
# Training DAG (MLflow)
# ---------------------------------------------------------------------------


class TestTrainingDag:
    @pytest.fixture(autouse=True)
    def _load(self):
        self.dag = _load_dag("training_dag", "searchflow_training")

    def test_import_succeeds(self):
        assert self.dag is not None

    def test_schedule_weekly(self):
        assert self.dag.schedule_interval == "0 0 * * 0"

    def test_has_three_training_tasks(self):
        task_ids = [t.task_id for t in self.dag.topological_sort()]
        assert "train_churn" in task_ids
        assert "train_sentiment" in task_ids
        assert "train_recommender" in task_ids
        assert task_ids.index("train_churn") < task_ids.index("train_sentiment")
        assert task_ids.index("train_sentiment") < task_ids.index("train_recommender")

    def test_task_commands_reference_training_scripts(self):
        for task_id, script_module in [
            ("train_churn", "src.training.train_churn"),
            ("train_sentiment", "src.training.train_sentiment"),
            ("train_recommender", "src.training.train_recommender"),
        ]:
            task = self.dag.get_task(task_id)
            assert script_module in task.bash_command

    def test_no_catchup(self):
        assert self.dag.catchup is False
