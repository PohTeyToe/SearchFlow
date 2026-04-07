"""Push sample metrics to Prometheus for dashboard population.

Usage: python scripts/seed_metrics.py [--duration 300] [--port 9999]
"""

import argparse
import json
import random
import time
from pathlib import Path

from prometheus_client import (
    Counter, Gauge, Histogram, Summary,
    start_http_server, REGISTRY,
)

# Write seed targets file for Prometheus file_sd_configs
SEED_TARGETS_PATH = Path(__file__).parent.parent / "monitoring" / "prometheus" / "seed_targets.json"


def write_seed_targets(port: int):
    targets = [{"targets": [f"host.docker.internal:{port}"]}]
    SEED_TARGETS_PATH.write_text(json.dumps(targets))


def remove_seed_targets():
    if SEED_TARGETS_PATH.exists():
        SEED_TARGETS_PATH.unlink()


def main():
    parser = argparse.ArgumentParser(description="Seed Prometheus with sample metrics")
    parser.add_argument("--duration", type=int, default=300, help="Seconds to run (default 300)")
    parser.add_argument("--port", type=int, default=9999, help="Metrics server port (default 9999)")
    args = parser.parse_args()

    # Register metrics
    http_requests = Counter(
        "http_requests_total", "Total HTTP requests",
        ["method", "handler", "status"],
    )
    http_duration = Histogram(
        "http_request_duration_seconds", "Request duration",
        ["method", "handler"],
        buckets=[0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0],
    )
    http_in_progress = Gauge("http_requests_in_progress", "In-flight requests")
    http_response_size = Summary("http_response_size_bytes", "Response size", ["handler"])

    airflow_dagrun = Counter("airflow_dagrun_duration_sum", "DAG run durations", ["dag_id", "state"])
    airflow_task = Counter("airflow_dag_task_duration_sum", "Task durations", ["dag_id", "task_id"])
    airflow_heartbeat = Gauge("airflow_scheduler_heartbeat", "Scheduler heartbeat")
    airflow_sla = Counter("airflow_sla_missed", "SLA misses")
    airflow_running = Gauge("airflow_dagrun_running", "Running DAGs")
    airflow_pool_open = Gauge("airflow_pool_open_slots", "Open pool slots")
    airflow_pool_used = Gauge("airflow_pool_used_slots", "Used pool slots")

    kafka_lag = Gauge("kafka_consumergroup_lag", "Consumer lag", ["consumergroup", "topic", "partition"])
    kafka_offset = Counter("kafka_topic_partition_current_offset", "Topic offset", ["topic", "partition"])
    kafka_brokers = Gauge("kafka_brokers", "Active brokers")
    kafka_partitions = Gauge("kafka_topic_partitions", "Topic partitions", ["topic"])

    # Start server
    start_http_server(args.port)
    write_seed_targets(args.port)
    print(f"Metrics server running on :{args.port}, Prometheus targets written")

    endpoints = ["/health", "/churn/{user_id}", "/recommend/{user_id}", "/sentiment", "/model-metrics"]
    dag_ids = ["searchflow_ingestion", "searchflow_transformation", "searchflow_reverse_etl", "searchflow_training"]

    try:
        start = time.time()
        while time.time() - start < args.duration:
            # Simulate HTTP traffic
            for ep in endpoints:
                n = random.randint(1, 20)
                for _ in range(n):
                    status = random.choices(["200", "201", "400", "500"], weights=[90, 5, 3, 2])[0]
                    http_requests.labels(method="POST", handler=ep, status=status).inc()
                    latency = random.gauss(0.05, 0.02) if ep == "/health" else random.gauss(0.15, 0.05)
                    http_duration.labels(method="POST", handler=ep).observe(max(0.001, latency))
                    http_response_size.labels(handler=ep).observe(random.randint(100, 5000))

            http_in_progress.set(random.randint(0, 15))

            # Simulate Airflow metrics
            for dag in dag_ids:
                airflow_dagrun.labels(dag_id=dag, state="success").inc(random.randint(0, 3))
                airflow_task.labels(dag_id=dag, task_id="main_task").inc(random.uniform(10, 120))
            airflow_heartbeat.set(time.time())
            airflow_running.set(random.randint(0, 3))
            airflow_pool_open.set(random.randint(5, 32))
            airflow_pool_used.set(random.randint(0, 10))

            # Simulate Kafka metrics
            for p in range(3):
                kafka_lag.labels(consumergroup="searchflow-consumers", topic="search_events", partition=str(p)).set(random.randint(0, 500))
                kafka_offset.labels(topic="search_events", partition=str(p)).inc(random.randint(50, 200))
            kafka_brokers.set(1)
            kafka_partitions.labels(topic="search_events").set(3)

            time.sleep(15)  # Match Prometheus scrape interval
    except KeyboardInterrupt:
        pass
    finally:
        remove_seed_targets()
        print("Seed targets removed, shutting down")


if __name__ == "__main__":
    main()
