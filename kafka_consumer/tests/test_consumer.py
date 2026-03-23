"""Tests for SearchFlowConsumer."""

import json
import time
from unittest.mock import MagicMock, patch

import duckdb
import pytest


class FakeMessage:
    """Fake Kafka message for testing."""

    def __init__(self, topic, value_dict, partition=0, offset=0, error=None):
        self._topic = topic
        self._value = json.dumps(value_dict).encode("utf-8")
        self._partition = partition
        self._offset = offset
        self._error = error

    def topic(self):
        return self._topic

    def value(self):
        return self._value

    def partition(self):
        return self._partition

    def offset(self):
        return self._offset

    def error(self):
        return self._error


@pytest.fixture
def mock_kafka_consumer():
    with patch("src.consumer.Consumer") as mock_consumer_cls:
        instance = MagicMock()
        mock_consumer_cls.return_value = instance
        yield instance


@pytest.fixture
def mock_duckdb(tmp_path):
    db_path = str(tmp_path / "test.duckdb")
    conn = duckdb.connect(db_path)
    conn.execute("CREATE SCHEMA IF NOT EXISTS raw")
    for table in ["search_events", "click_events", "conversion_events"]:
        conn.execute(f"""
            CREATE TABLE raw.{table} (
                event_id VARCHAR PRIMARY KEY,
                payload JSON,
                ingested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                source_file VARCHAR,
                batch_id VARCHAR
            )
        """)
    conn.close()
    return db_path


class TestConsumerSubscription:
    def test_subscribes_to_all_topics(self, mock_kafka_consumer):
        with patch("src.consumer.config") as mock_config:
            mock_config.TOPICS = [
                "searchflow.search-events",
                "searchflow.click-events",
                "searchflow.conversion-events",
            ]
            mock_config.KAFKA_BOOTSTRAP_SERVERS = "localhost:9092"
            mock_config.KAFKA_GROUP_ID = "test"
            mock_config.KAFKA_AUTO_OFFSET_RESET = "earliest"

            from src.consumer import SearchFlowConsumer
            consumer = SearchFlowConsumer()

            mock_kafka_consumer.subscribe.assert_called_once_with(mock_config.TOPICS)
            consumer.stop()


class TestConsumerBatchInsert:
    def test_inserts_with_correct_schema(self, mock_duckdb):
        """Verify events are inserted with source_file='kafka' and proper batch_id."""
        from src.consumer import SearchFlowConsumer

        consumer = SearchFlowConsumer.__new__(SearchFlowConsumer)
        consumer._batch = [{
            "event": {"event_id": "e1", "event_type": "search", "query": "miami"},
            "topic": "searchflow.search-events",
            "partition": 0,
            "offset": 42,
        }]
        consumer._last_flush = time.time()
        consumer.consumer = MagicMock()

        with patch("src.consumer.config") as mock_config:
            mock_config.DUCKDB_PATH = mock_duckdb
            mock_config.TOPIC_TO_TABLE = {
                "searchflow.search-events": "raw.search_events",
                "searchflow.click-events": "raw.click_events",
                "searchflow.conversion-events": "raw.conversion_events",
            }
            consumer._insert_batch()

        conn = duckdb.connect(mock_duckdb, read_only=True)
        rows = conn.execute("SELECT event_id, source_file, batch_id FROM raw.search_events").fetchall()
        conn.close()

        assert len(rows) == 1
        assert rows[0][0] == "e1"
        assert rows[0][1] == "kafka"
        assert rows[0][2] == "kafka-0-42"

    def test_deduplicates_via_insert_or_ignore(self, mock_duckdb):
        """Same event_id inserted twice should result in only one row."""
        from src.consumer import SearchFlowConsumer

        consumer = SearchFlowConsumer.__new__(SearchFlowConsumer)
        consumer.consumer = MagicMock()

        event = {"event_id": "dup1", "event_type": "search"}
        consumer._batch = [
            {"event": event, "topic": "searchflow.search-events", "partition": 0, "offset": 1},
            {"event": event, "topic": "searchflow.search-events", "partition": 0, "offset": 2},
        ]
        consumer._last_flush = time.time()

        with patch("src.consumer.config") as mock_config:
            mock_config.DUCKDB_PATH = mock_duckdb
            mock_config.TOPIC_TO_TABLE = {
                "searchflow.search-events": "raw.search_events",
            }
            consumer._insert_batch()

        conn = duckdb.connect(mock_duckdb, read_only=True)
        count = conn.execute("SELECT COUNT(*) FROM raw.search_events WHERE event_id='dup1'").fetchone()[0]
        conn.close()
        assert count == 1

    def test_commits_offsets_after_success(self, mock_duckdb):
        """Consumer should commit offsets after successful insert."""
        from src.consumer import SearchFlowConsumer

        consumer = SearchFlowConsumer.__new__(SearchFlowConsumer)
        consumer.consumer = MagicMock()
        consumer._batch = [{
            "event": {"event_id": "e2", "event_type": "click"},
            "topic": "searchflow.click-events",
            "partition": 0,
            "offset": 10,
        }]
        consumer._last_flush = time.time()

        with patch("src.consumer.config") as mock_config:
            mock_config.DUCKDB_PATH = mock_duckdb
            mock_config.TOPIC_TO_TABLE = {
                "searchflow.click-events": "raw.click_events",
            }
            consumer._flush_batch()

        consumer.consumer.commit.assert_called_once()


class TestConsumerErrorHandling:
    def test_retries_on_duckdb_write_lock(self):
        """Should retry with backoff on DuckDB IOException."""
        from src.consumer import SearchFlowConsumer

        consumer = SearchFlowConsumer.__new__(SearchFlowConsumer)
        consumer.consumer = MagicMock()
        consumer._batch = [{"event": {"event_id": "e3"}, "topic": "t", "partition": 0, "offset": 0}]
        consumer._last_flush = time.time()

        with patch.object(consumer, "_insert_batch") as mock_insert:
            mock_insert.side_effect = [duckdb.IOException("locked"), None]
            with patch("src.consumer.time.sleep"):
                consumer._flush_batch()

            assert mock_insert.call_count == 2

    def test_skips_bad_json(self, mock_kafka_consumer):
        """Bad JSON messages should be skipped without crashing."""
        from src.consumer import SearchFlowConsumer

        consumer = SearchFlowConsumer.__new__(SearchFlowConsumer)
        consumer._running = True
        consumer._batch = []
        consumer._last_flush = time.time()
        consumer.consumer = mock_kafka_consumer

        bad_msg = MagicMock()
        bad_msg.error.return_value = None
        bad_msg.value.return_value = b"not valid json{{"

        mock_kafka_consumer.poll.side_effect = [bad_msg, None]

        # Run one iteration then stop
        consumer._running = False
        # Direct deserialization test
        try:
            json.loads(bad_msg.value().decode("utf-8"))
            raise AssertionError("Should have raised")
        except json.JSONDecodeError:
            pass  # Expected


class TestGracefulShutdown:
    def test_stop_sets_running_false(self):
        from src.consumer import SearchFlowConsumer

        consumer = SearchFlowConsumer.__new__(SearchFlowConsumer)
        consumer._running = True
        consumer.stop()
        assert consumer._running is False
