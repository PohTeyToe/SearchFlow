"""Tests for KafkaPublisher and CLI --output kafka/all extensions."""

import json
from unittest.mock import patch, MagicMock

import pytest

from src.publishers import KafkaPublisher, MultiPublisher, FilePublisher, Publisher, create_publisher
from src.config import Config


@pytest.fixture
def mock_producer():
    """Patch confluent_kafka.Producer so no real broker is needed."""
    with patch("src.publishers.Producer") as MockProducer:
        instance = MagicMock()
        MockProducer.return_value = instance
        yield instance


@pytest.fixture
def publisher(mock_producer):
    """KafkaPublisher wired to the mocked producer."""
    return KafkaPublisher(bootstrap_servers="localhost:9092")


class TestKafkaPublisher:
    def test_extends_publisher_abc(self, publisher):
        assert isinstance(publisher, Publisher)

    def test_derives_topic_from_event_type(self, publisher, mock_producer):
        event = {"event_type": "search", "event_id": "e1", "user_id": "u1"}
        publisher.publish(event)
        call_args = mock_producer.produce.call_args
        assert call_args.kwargs["topic"] == "searchflow.search-events"

    def test_derives_click_topic(self, publisher, mock_producer):
        event = {"event_type": "click", "event_id": "e2", "user_id": "u1"}
        publisher.publish(event)
        call_args = mock_producer.produce.call_args
        assert call_args.kwargs["topic"] == "searchflow.click-events"

    def test_serializes_event_as_json(self, publisher, mock_producer):
        event = {"event_type": "search", "event_id": "e1", "user_id": "u1", "query": "miami"}
        publisher.publish(event)
        call_args = mock_producer.produce.call_args
        value = call_args.kwargs["value"]
        assert json.loads(value.decode("utf-8")) == event

    def test_uses_user_id_as_key(self, publisher, mock_producer):
        event = {"event_type": "search", "event_id": "e1", "user_id": "user_42"}
        publisher.publish(event)
        call_args = mock_producer.produce.call_args
        assert call_args.kwargs["key"] == b"user_42"

    def test_none_key_for_anonymous(self, publisher, mock_producer):
        event = {"event_type": "search", "event_id": "e1"}
        publisher.publish(event)
        call_args = mock_producer.produce.call_args
        assert call_args.kwargs["key"] is None

    def test_delivery_callback_logs_errors(self, publisher, caplog):
        mock_msg = MagicMock()
        mock_msg.topic.return_value = "test-topic"
        mock_err = MagicMock()
        mock_err.__str__ = lambda self: "test error"
        import logging
        with caplog.at_level(logging.ERROR):
            publisher._delivery_callback(mock_err, mock_msg)
        assert "Delivery failed" in caplog.text

    def test_close_flushes(self, publisher, mock_producer):
        publisher.close()
        mock_producer.flush.assert_called_once_with(timeout=10)


class TestCreatePublisherKafka:
    @patch("src.publishers.Producer")
    def test_output_kafka_creates_kafka_publisher(self, mock_prod):
        pub = create_publisher("kafka", kafka_bootstrap_servers="localhost:9092")
        assert isinstance(pub, KafkaPublisher)

    @patch("src.publishers.Producer")
    @patch("src.publishers.redis.Redis")
    def test_output_all_creates_multi_publisher(self, mock_redis, mock_prod):
        mock_redis.return_value.ping.return_value = True
        pub = create_publisher("all", kafka_bootstrap_servers="localhost:9092")
        assert isinstance(pub, MultiPublisher)
        assert len(pub.publishers) == 3

    def test_output_file_no_kafka(self):
        pub = create_publisher("file")
        assert isinstance(pub, FilePublisher)


class TestKafkaConfig:
    def test_default_bootstrap_servers(self):
        c = Config()
        assert c.kafka_bootstrap_servers == "kafka:9092"
