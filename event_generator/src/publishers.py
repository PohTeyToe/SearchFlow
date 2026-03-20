"""Publishers for outputting generated events."""

import json
import logging
import os
from abc import ABC, abstractmethod
from datetime import datetime
from pathlib import Path
from typing import Dict, Any, Optional

import redis
from confluent_kafka import Producer

logger = logging.getLogger(__name__)


class Publisher(ABC):
    """Abstract base class for event publishers."""
    
    @abstractmethod
    def publish(self, event: Dict[str, Any]) -> None:
        """Publish a single event."""
        pass
    
    @abstractmethod
    def close(self) -> None:
        """Clean up resources."""
        pass


class RedisPublisher(Publisher):
    """Publish events to Redis Streams."""
    
    def __init__(self, host: str = "localhost", port: int = 6379):
        self.client = redis.Redis(host=host, port=port, decode_responses=True)
        self._verify_connection()
    
    def _verify_connection(self) -> None:
        """Verify Redis connection is working."""
        try:
            self.client.ping()
        except redis.ConnectionError as e:
            raise ConnectionError(f"Could not connect to Redis: {e}")
    
    def publish(self, event: Dict[str, Any]) -> None:
        """Publish event to appropriate Redis stream."""
        event_type = event.get("event_type", "unknown")
        stream_name = f"searchflow:events:{event_type}"
        
        # Add to stream with auto-generated ID
        self.client.xadd(
            stream_name,
            {"data": json.dumps(event)},
            maxlen=100000  # Keep last 100k events per stream
        )
    
    def close(self) -> None:
        """Close Redis connection."""
        self.client.close()


class FilePublisher(Publisher):
    """Publish events to JSONL files."""
    
    def __init__(self, output_dir: str = "/data/raw"):
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)
        self._file_handles: Dict[str, Any] = {}
    
    def publish(self, event: Dict[str, Any]) -> None:
        """Append event to appropriate JSONL file."""
        event_type = event.get("event_type", "unknown")
        
        # Get or create file handle
        if event_type not in self._file_handles:
            filepath = self.output_dir / f"{event_type}_events.jsonl"
            self._file_handles[event_type] = open(filepath, "a")
        
        # Write event as JSON line
        self._file_handles[event_type].write(json.dumps(event) + "\n")
        self._file_handles[event_type].flush()
    
    def close(self) -> None:
        """Close all file handles."""
        for handle in self._file_handles.values():
            handle.close()
        self._file_handles.clear()


class ConsolePublisher(Publisher):
    """Publish events to console (for debugging)."""
    
    def __init__(self, pretty: bool = False):
        self.pretty = pretty
    
    def publish(self, event: Dict[str, Any]) -> None:
        """Print event to console."""
        if self.pretty:
            print(json.dumps(event, indent=2))
        else:
            event_type = event.get("event_type", "?")
            event_id = event.get("event_id", "?")[:8]
            print(f"[{event_type}] {event_id}: {event.get('query', event.get('result_destination', ''))}")
    
    def close(self) -> None:
        """No-op for console publisher."""
        pass


class KafkaPublisher(Publisher):
    """Publish events to Kafka topics."""

    def __init__(self, bootstrap_servers: str = "kafka:9092"):
        self.producer = Producer({
            "bootstrap.servers": bootstrap_servers,
            "enable.idempotence": True,
            "compression.type": "lz4",
            "linger.ms": 100,
            "batch.size": 16384,
        })

    def publish(self, event: Dict[str, Any]) -> None:
        """Publish event to the appropriate Kafka topic."""
        event_type = event.get("event_type", "unknown")
        topic = f"searchflow.{event_type}-events"
        user_id = event.get("user_id")
        key = user_id.encode("utf-8") if user_id else None
        value = json.dumps(event).encode("utf-8")
        self.producer.produce(
            topic=topic, key=key, value=value, callback=self._delivery_callback
        )
        self.producer.poll(0)

    def _delivery_callback(self, err, msg):
        """Called once per message to indicate delivery result."""
        if err is not None:
            logger.error("Delivery failed for %s: %s", msg.topic(), err)

    def close(self) -> None:
        """Flush pending messages and clean up."""
        self.producer.flush(timeout=10)


class MultiPublisher(Publisher):
    """Publish to multiple destinations."""
    
    def __init__(self, publishers: list):
        self.publishers = publishers
    
    def publish(self, event: Dict[str, Any]) -> None:
        """Publish to all configured publishers."""
        for publisher in self.publishers:
            publisher.publish(event)
    
    def close(self) -> None:
        """Close all publishers."""
        for publisher in self.publishers:
            publisher.close()


def create_publisher(
    output_type: str = "file",
    redis_host: Optional[str] = None,
    redis_port: Optional[int] = None,
    output_dir: Optional[str] = None,
    kafka_bootstrap_servers: Optional[str] = None,
) -> Publisher:
    """Factory function to create appropriate publisher."""

    if output_type == "redis":
        return RedisPublisher(
            host=redis_host or os.getenv("REDIS_HOST", "localhost"),
            port=redis_port or int(os.getenv("REDIS_PORT", "6379"))
        )
    elif output_type == "file":
        return FilePublisher(
            output_dir=output_dir or os.getenv("OUTPUT_DIR", "/data/raw")
        )
    elif output_type == "console":
        return ConsolePublisher(pretty=True)
    elif output_type == "both":
        return MultiPublisher([
            FilePublisher(output_dir=output_dir or os.getenv("OUTPUT_DIR", "/data/raw")),
            RedisPublisher(
                host=redis_host or os.getenv("REDIS_HOST", "localhost"),
                port=redis_port or int(os.getenv("REDIS_PORT", "6379"))
            )
        ])
    elif output_type == "kafka":
        return KafkaPublisher(
            bootstrap_servers=kafka_bootstrap_servers
            or os.getenv("KAFKA_BOOTSTRAP_SERVERS", "kafka:9092")
        )
    elif output_type == "all":
        return MultiPublisher([
            FilePublisher(output_dir=output_dir or os.getenv("OUTPUT_DIR", "/data/raw")),
            RedisPublisher(
                host=redis_host or os.getenv("REDIS_HOST", "localhost"),
                port=redis_port or int(os.getenv("REDIS_PORT", "6379"))
            ),
            KafkaPublisher(
                bootstrap_servers=kafka_bootstrap_servers
                or os.getenv("KAFKA_BOOTSTRAP_SERVERS", "kafka:9092")
            ),
        ])
    else:
        raise ValueError(f"Unknown output type: {output_type}")
