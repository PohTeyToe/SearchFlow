# SearchFlow Incident Runbook

## How to Use This Runbook

This document covers the 5 most common failure modes in SearchFlow. Each scenario includes detection, diagnosis steps, remediation, escalation criteria, and prevention measures. When an alert fires or anomaly is detected, find the matching scenario below and follow the decision tree.

## Service Endpoints Quick Reference

| Service | URL | Purpose |
|-|-|-|
| Grafana | http://localhost:3001 | Dashboards and log exploration |
| Prometheus | http://localhost:9090 | Metric queries and target status |
| Airflow | http://localhost:8080 | DAG management, SLA misses, task logs |
| ML Engine | http://localhost:8000 | API health, monitoring endpoints |
| ML Engine Drift | http://localhost:8000/monitor/drift | Latest drift status |
| ML Engine Performance | http://localhost:8000/monitor/performance | Historical performance records |
| MLflow | http://localhost:5000 | Experiment tracking, model artifacts |
| Loki | http://localhost:3100 | Direct log API queries |

---

## Scenario 1: Kafka Consumer Lag > 1000

**Detection:** The Kafka Metrics dashboard in Grafana shows the consumer lag gauge turning red. The Prometheus alert `KafkaConsumerLagHigh` fires when `kafka_consumergroup_lag` exceeds 1000 for any consumer group. You may also observe stale data in downstream tables or delayed dashboard updates.

### Decision Tree

1. **Confirm the lag.** Open Grafana at http://localhost:3001 and navigate to the Kafka Metrics dashboard. Check the Consumer Lag panel. Alternatively, run the PromQL query:
   ```
   kafka_consumergroup_lag{group="searchflow-consumer-group"}
   ```
   If the value is below 1000, the alert may have auto-resolved. Verify the alert history in Prometheus at http://localhost:9090/alerts.

2. **Check consumer health.** Verify the Kafka consumer container is running:
   ```bash
   docker ps --filter name=searchflow-kafka-consumer
   docker logs --tail 100 searchflow-kafka-consumer
   ```
   Look for connection errors, deserialization failures, or OOM kills. Check Loki for recent errors:
   ```
   {container="searchflow-kafka-consumer"} |= "error" | logfmt
   ```

3. **Check broker health.** Verify Kafka brokers are reachable and partitions are healthy:
   ```bash
   docker exec searchflow-kafka kafka-topics.sh --bootstrap-server localhost:9092 --describe --topic search-events
   ```
   Look for under-replicated partitions or offline leaders.

4. **Check DuckDB write contention.** The consumer uses batch inserts with write-lock retry. If DuckDB is locked by a long-running dbt transformation or Spark job, inserts will back up. Check for active connections:
   ```bash
   docker logs --tail 50 searchflow-kafka-consumer | grep "write lock"
   ```

5. **Remediate.** If the consumer is crashed, restart it: `docker restart searchflow-kafka-consumer`. If DuckDB is locked, wait for the blocking query to finish or restart the blocking container. If the topic has excessive partitions relative to consumer instances, scale consumers in `docker-compose.yml`.

6. **Verify recovery.** Watch the lag metric decrease in the Kafka Metrics dashboard. Confirm new events appear in DuckDB:
   ```sql
   SELECT max(event_timestamp) FROM raw_events.search_events;
   ```

### Escalation

Escalate if lag does not decrease within 15 minutes of remediation, if Kafka brokers show disk usage above 85%, or if consumer repeatedly crashes after restart.

### Prevention

- Set up Prometheus alerting rules for `kafka_consumergroup_lag > 500` as a warning threshold.
- Monitor consumer container memory usage to catch OOM conditions before they cause crashes.
- Schedule dbt runs and Spark jobs to avoid overlapping with peak event ingestion windows.

---

## Scenario 2: Model Accuracy Drop Below 0.80

**Detection:** The endpoint `/monitor/drift` returns `drift_detected: true`. The ML Serving dashboard in Grafana shows the accuracy metric falling below the 0.80 threshold. The weekly `training_dag` in Airflow may also log drift warnings during its evaluation step.

### Decision Tree

1. **Confirm drift status.** Query the drift endpoint directly:
   ```bash
   curl -s http://localhost:8000/monitor/drift | python -m json.tool
   ```
   Check the `drift_detected` field and `drift_score`. Review the full Evidently report at `/monitor/drift/report`.

2. **Check performance history.** Query the performance endpoint to see the trend:
   ```bash
   curl -s http://localhost:8000/monitor/performance | python -m json.tool
   ```
   Also check in Grafana via PromQL:
   ```
   ml_model_accuracy{model="churn"}
   ml_model_accuracy{model="sentiment"}
   ```

3. **Identify the source.** Open MLflow at http://localhost:5000 and compare recent training runs against the baseline. Look for changes in feature distributions, missing features, or data quality issues. Check Loki for model serving errors:
   ```
   {container="searchflow-ml-engine"} |= "prediction" |= "error"
   ```

4. **Check upstream data quality.** Run dbt source freshness tests and inspect recent data:
   ```bash
   docker exec searchflow-airflow-scheduler dbt source freshness
   docker exec searchflow-airflow-scheduler dbt test --select tag:data_quality
   ```
   Look for null spikes, cardinality shifts, or schema changes in staging models.

5. **Trigger retraining.** If drift is confirmed and data quality is acceptable, manually trigger the training DAG:
   ```bash
   docker exec searchflow-airflow-scheduler airflow dags trigger training_dag
   ```
   Monitor the run in the Airflow UI. After completion, verify the new model is registered in MLflow and the accuracy has recovered.

6. **Verify recovery.** After the new model is deployed, confirm `/monitor/drift` returns `drift_detected: false` and accuracy metrics in Grafana return above 0.80.

### Escalation

Escalate if retraining does not recover accuracy above 0.80, if drift is caused by a fundamental schema change in source data, or if multiple models degrade simultaneously.

### Prevention

- Run the `monitoring_dag` on a regular schedule to detect drift early before it impacts predictions.
- Maintain feature distribution baselines in MLflow artifacts for comparison.
- Add data quality assertions in dbt intermediate models to catch upstream shifts before they reach training data.

---

## Scenario 3: Pipeline SLA Miss

**Detection:** The Airflow UI shows entries in the SLA Misses view. The Prometheus metric `airflow_sla_missed` increments. The Pipeline Health dashboard in Grafana shows a gap or delay in the expected pipeline cadence (ingestion every 5 minutes, transformation every hour, reverse-ETL every 6 hours).

### Decision Tree

1. **Identify which DAG missed its SLA.** Check the Airflow SLA Misses page at http://localhost:8080/sla. Run the PromQL query:
   ```
   increase(airflow_sla_missed[1h])
   ```
   Note the DAG ID, task ID, and the timestamp of the miss.

2. **Check task logs.** In the Airflow UI, navigate to the failed or delayed task instance and read the full log output. Look for connection timeouts, resource exhaustion, or dependency failures. Also query Loki:
   ```
   {container="searchflow-airflow-worker"} |= "ERROR" | json dag_id="ingestion_dag"
   ```

3. **Check resource availability.** Verify that Airflow workers have sufficient CPU and memory:
   ```bash
   docker stats --no-stream searchflow-airflow-worker searchflow-airflow-scheduler
   ```
   Check if the scheduler is running and processing queued tasks:
   ```bash
   docker logs --tail 50 searchflow-airflow-scheduler | grep "executor"
   ```

4. **Check external dependencies.** If the missed DAG depends on Kafka, DuckDB, or PostgreSQL, verify those services are healthy:
   ```bash
   docker ps --filter name=searchflow-kafka --filter name=searchflow-duckdb --filter name=searchflow-postgres
   ```

5. **Clear and retry.** If the root cause is resolved, clear the failed task in Airflow to trigger a retry:
   ```bash
   docker exec searchflow-airflow-scheduler airflow tasks clear <dag_id> -t <task_id> -s <start_date> -e <end_date> --yes
   ```

6. **Verify recovery.** Confirm the task completes successfully and downstream DAGs resume their normal schedule. Check the Pipeline Health dashboard for the gap to close.

### Escalation

Escalate if SLA misses cascade to downstream DAGs (transformation blocked by ingestion, reverse-ETL blocked by transformation), if the Airflow scheduler itself is unresponsive, or if misses recur on three consecutive runs.

### Prevention

- Set SLA durations with appropriate buffer (2x expected runtime) to avoid false alarms.
- Monitor Airflow scheduler heartbeat via `airflow_scheduler_heartbeat` metric.
- Use task-level retries with exponential backoff for transient failures.

---

## Scenario 4: High API Error Rate (>5% 5xx)

**Detection:** The ML Serving dashboard in Grafana shows the Error Rate gauge turning red. The Prometheus alert `HighErrorRate` fires when the ratio `rate(http_requests_total{status=~"5.."}[5m]) / rate(http_requests_total[5m])` exceeds 0.05.

### Decision Tree

1. **Quantify the error rate.** Run the PromQL query in Prometheus:
   ```
   sum(rate(http_requests_total{status=~"5..", service="ml-engine"}[5m])) / sum(rate(http_requests_total{service="ml-engine"}[5m]))
   ```
   Check which specific endpoints are failing:
   ```
   topk(5, sum by (endpoint) (rate(http_requests_total{status=~"5.."}[5m])))
   ```

2. **Check application logs.** Review ML Engine container logs for stack traces:
   ```bash
   docker logs --tail 200 searchflow-ml-engine | grep -i "error\|traceback\|exception"
   ```
   Query Loki for structured error analysis:
   ```
   {container="searchflow-ml-engine"} |= "500" | logfmt | line_format "{{.endpoint}} {{.error}}"
   ```

3. **Check resource saturation.** Inspect container CPU and memory:
   ```bash
   docker stats --no-stream searchflow-ml-engine
   ```
   Check if the FastAPI process is running out of worker threads or hitting memory limits. Review PromQL:
   ```
   process_resident_memory_bytes{job="ml-engine"}
   ```

4. **Check model loading.** If errors are on prediction endpoints, verify models are loaded correctly:
   ```bash
   curl -s http://localhost:8000/health
   curl -s http://localhost:8000/models
   ```
   If models failed to load from MLflow, check MLflow availability at http://localhost:5000.

5. **Remediate.** If the issue is memory exhaustion, restart the container with increased limits in `docker-compose.yml`. If models are corrupt, re-register from MLflow. If a specific endpoint is broken, check recent code changes:
   ```bash
   docker restart searchflow-ml-engine
   ```

6. **Verify recovery.** Watch the error rate drop below 5% in the ML Serving dashboard. Confirm all endpoints return 200:
   ```bash
   curl -s -o /dev/null -w "%{http_code}" http://localhost:8000/health
   curl -s -o /dev/null -w "%{http_code}" http://localhost:8000/predict/churn -X POST -H "Content-Type: application/json" -d '{"features": {}}'
   ```

### Escalation

Escalate if error rate remains above 5% after container restart, if the root cause is a code regression requiring a rollback, or if errors affect the Search Assistant service (which depends on ML Engine).

### Prevention

- Implement circuit breakers in the Search Assistant to gracefully degrade when ML Engine is unhealthy.
- Set memory and CPU limits in `docker-compose.yml` to prevent resource starvation.
- Run `test_api.py` integration tests before deploying model or code changes.

---

## Scenario 5: Data Freshness Alert

**Detection:** The dbt source freshness check returns an error state. The Pipeline Health dashboard in Grafana shows gaps in the data freshness timeline. The metric `dbt_source_freshness_seconds` exceeds the configured threshold.

### Decision Tree

1. **Confirm staleness.** Run dbt source freshness manually:
   ```bash
   docker exec searchflow-airflow-scheduler dbt source freshness --output json
   ```
   Check which sources are stale and by how much. Cross-reference with the Pipeline Health dashboard in Grafana.

2. **Trace the pipeline backwards.** Identify where data flow stopped. Check in order:
   - **Reverse-ETL:** Is the `reverse_etl_dag` running? Check Airflow UI.
   - **dbt transformation:** Is the `transformation_dag` completing? Check the most recent run.
   - **Ingestion:** Is the `ingestion_dag` loading new data? Check task logs.
   - **Kafka consumer:** Is the consumer writing to DuckDB? Check `kafka_consumergroup_lag`.
   - **Event generator:** Is the generator producing events?

3. **Check DuckDB directly.** Query the most recent timestamps in key tables:
   ```sql
   SELECT 'raw_events' as layer, max(event_timestamp) as latest FROM raw_events.search_events
   UNION ALL
   SELECT 'staging', max(event_timestamp) FROM staging.stg_search_events
   UNION ALL
   SELECT 'marts', max(created_at) FROM marts.mart_ml_features;
   ```

4. **Check connection strings.** Verify that services can reach DuckDB and PostgreSQL. Look for connection refused or timeout errors in Loki:
   ```
   {container=~"searchflow-.*"} |= "connection refused" or |= "timeout"
   ```

5. **Remediate.** Restart the stalled component. If ingestion is blocked, restart the Kafka consumer or event generator. If transformation is stuck, clear the failed dbt task in Airflow. If reverse-ETL is failing, check PostgreSQL connectivity.

6. **Backfill if needed.** If there is a significant data gap, trigger a backfill:
   ```bash
   docker exec searchflow-airflow-scheduler airflow dags backfill ingestion_dag -s <start_date> -e <end_date>
   ```
   After backfill, rerun dbt and verify freshness returns to normal.

### Escalation

Escalate if data staleness exceeds 1 hour for ingestion sources, 4 hours for transformation outputs, or 12 hours for reverse-ETL targets. Escalate immediately if the root cause is data corruption or schema mismatch.

### Prevention

- Configure dbt source freshness thresholds with `warn_after` and `error_after` to catch staleness early.
- Add Airflow sensor tasks that block downstream DAGs until upstream data meets freshness requirements.
- Monitor `kafka_consumergroup_lag` as a leading indicator of downstream freshness issues.

---

## General Diagnostic Commands

| Command | Purpose |
|-|-|
| `docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"` | View all running containers with port mappings |
| `docker stats --no-stream` | One-shot resource usage for all containers |
| `docker logs --tail 100 <container>` | View recent logs for a specific container |
| `curl -s http://localhost:8000/health` | Check ML Engine health |
| `curl -s http://localhost:8000/monitor/drift` | Check current drift status |
| `curl -s http://localhost:8000/monitor/performance` | Check model performance history |
| `curl -s http://localhost:9090/api/v1/alerts` | List active Prometheus alerts |
| `docker exec searchflow-airflow-scheduler dbt source freshness` | Run dbt source freshness checks |
| `docker exec searchflow-airflow-scheduler dbt test` | Run all dbt tests |
| `docker exec searchflow-airflow-scheduler airflow dags list` | List all registered DAGs |
| `docker exec searchflow-airflow-scheduler airflow dags trigger <dag_id>` | Manually trigger a DAG run |
| `docker exec searchflow-kafka kafka-consumer-groups.sh --bootstrap-server localhost:9092 --group searchflow-consumer-group --describe` | Describe consumer group lag per partition |
