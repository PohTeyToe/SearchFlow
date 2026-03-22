"""Kafka consumer with batch DuckDB insert logic."""

import json
import logging
import signal
import time
from typing import Any

import duckdb
from confluent_kafka import Consumer, KafkaError

from . import config

logger = logging.getLogger(__name__)


class SearchFlowConsumer:
    """Consumes events from Kafka topics and batch-inserts into DuckDB."""

    def __init__(self):
        self.consumer = Consumer({
            "bootstrap.servers": config.KAFKA_BOOTSTRAP_SERVERS,
            "group.id": config.KAFKA_GROUP_ID,
            "auto.offset.reset": config.KAFKA_AUTO_OFFSET_RESET,
            "enable.auto.commit": False,
        })
        self.consumer.subscribe(config.TOPICS)
        self._running = True
        self._batch: list[dict[str, Any]] = []
        self._last_flush = time.time()

        signal.signal(signal.SIGINT, self._signal_handler)
        signal.signal(signal.SIGTERM, self._signal_handler)

    def _signal_handler(self, signum, frame):
        logger.info("Shutdown signal received, finishing current batch...")
        self._running = False

    def run(self):
        """Main consumer loop."""
        logger.info(
            "Starting consumer, subscribed to %s", config.TOPICS
        )
        try:
            while self._running:
                msg = self.consumer.poll(timeout=1.0)

                if msg is None:
                    # No message, check time-based flush
                    if self._batch and (time.time() - self._last_flush) >= config.BATCH_TIMEOUT_SECONDS:
                        self._flush_batch()
                    continue

                if msg.error():
                    if msg.error().code() == KafkaError._PARTITION_EOF:
                        logger.debug("End of partition reached: %s", msg.topic())
                    else:
                        logger.error("Consumer error: %s", msg.error())
                    continue

                # Deserialize message
                try:
                    event = json.loads(msg.value().decode("utf-8"))
                except (json.JSONDecodeError, UnicodeDecodeError) as e:
                    logger.error("Failed to deserialize message: %s", e)
                    continue

                self._batch.append({
                    "event": event,
                    "topic": msg.topic(),
                    "partition": msg.partition(),
                    "offset": msg.offset(),
                })

                # Size-based flush
                if len(self._batch) >= config.BATCH_SIZE:
                    self._flush_batch()

        finally:
            # Flush remaining
            if self._batch:
                self._flush_batch()
            self.consumer.close()
            logger.info("Consumer shut down cleanly")

    def _flush_batch(self):
        """Insert accumulated messages into DuckDB with retry on write lock."""
        if not self._batch:
            return

        max_retries = 5
        base_delay = 1.0

        for attempt in range(max_retries):
            try:
                self._insert_batch()
                self.consumer.commit()
                logger.info("Flushed %d messages to DuckDB", len(self._batch))
                self._batch.clear()
                self._last_flush = time.time()
                return
            except duckdb.IOException as e:
                if attempt < max_retries - 1:
                    delay = min(base_delay * (2 ** attempt), 30)
                    logger.warning(
                        "DuckDB write lock, retrying in %.1fs (attempt %d/%d): %s",
                        delay, attempt + 1, max_retries, e,
                    )
                    time.sleep(delay)
                else:
                    logger.error(
                        "Failed to write to DuckDB after %d retries, committing offsets to avoid infinite retry loop. "
                        "Data loss accepted for %d messages: %s",
                        max_retries, len(self._batch), e,
                    )
                    self.consumer.commit()
                    self._batch.clear()
                    self._last_flush = time.time()

    def _insert_batch(self):
        """Insert batch into DuckDB raw tables."""
        # Group by target table
        grouped: dict[str, list[dict]] = {}
        for item in self._batch:
            table = config.TOPIC_TO_TABLE.get(item["topic"])
            if table:
                grouped.setdefault(table, []).append(item)

        conn = duckdb.connect(config.DUCKDB_PATH)
        try:
            conn.execute("CREATE SCHEMA IF NOT EXISTS raw")
            for table, items in grouped.items():
                conn.execute(f"""
                    CREATE TABLE IF NOT EXISTS {table} (
                        event_id VARCHAR PRIMARY KEY,
                        payload JSON,
                        ingested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        source_file VARCHAR,
                        batch_id VARCHAR
                    )
                """)
                for item in items:
                    event = item["event"]
                    event_id = event.get("event_id", "")
                    batch_id = f"kafka-{item['partition']}-{item['offset']}"
                    conn.execute(
                        f"INSERT OR IGNORE INTO {table} (event_id, payload, source_file, batch_id) "
                        "VALUES (?, ?, 'kafka', ?)",
                        [event_id, json.dumps(event), batch_id],
                    )
        finally:
            conn.close()

    def stop(self):
        """Request graceful shutdown."""
        self._running = False
