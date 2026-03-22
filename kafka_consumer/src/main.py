"""Kafka consumer entry point for SearchFlow."""

import logging

from . import config
from .consumer import SearchFlowConsumer


def main():
    """Start the SearchFlow Kafka consumer."""
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    )
    logger = logging.getLogger(__name__)

    logger.info("SearchFlow Kafka Consumer starting")
    logger.info("  Bootstrap servers: %s", config.KAFKA_BOOTSTRAP_SERVERS)
    logger.info("  Topics: %s", config.TOPICS)
    logger.info("  Batch size: %d", config.BATCH_SIZE)
    logger.info("  DuckDB path: %s", config.DUCKDB_PATH)

    consumer = SearchFlowConsumer()
    consumer.run()


if __name__ == "__main__":
    main()
