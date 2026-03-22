"""Configuration for the Kafka consumer service."""

import os


KAFKA_BOOTSTRAP_SERVERS = os.getenv("KAFKA_BOOTSTRAP_SERVERS", "kafka:9092")
KAFKA_GROUP_ID = os.getenv("KAFKA_GROUP_ID", "searchflow-consumers")
KAFKA_AUTO_OFFSET_RESET = os.getenv("KAFKA_AUTO_OFFSET_RESET", "earliest")
DUCKDB_PATH = os.getenv("DUCKDB_PATH", "/data/searchflow.duckdb")
BATCH_SIZE = int(os.getenv("BATCH_SIZE", "100"))
BATCH_TIMEOUT_SECONDS = float(os.getenv("BATCH_TIMEOUT_SECONDS", "5.0"))

TOPICS = [
    "searchflow.search-events",
    "searchflow.click-events",
    "searchflow.conversion-events",
]

TOPIC_TO_TABLE = {
    "searchflow.search-events": "raw.search_events",
    "searchflow.click-events": "raw.click_events",
    "searchflow.conversion-events": "raw.conversion_events",
}
