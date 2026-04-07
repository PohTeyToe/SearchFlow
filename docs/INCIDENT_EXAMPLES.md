# Incident Postmortem Examples

## Postmortem 1: Null User IDs in Search Events Pipeline

**Date:** 2026-03-12
**Duration:** 4 hours 20 minutes (06:15 UTC - 10:35 UTC)
**Severity:** P2 -- Data integrity issue affecting downstream models

### What Happened

At 06:15 UTC, the Airflow `ingest_search_events` DAG ingested a batch of 12,400 search events from Kafka. Of these, 847 rows (6.8%) contained NULL `user_id` values. The null records propagated through the dbt staging layer (`stg_search_events`) into intermediate models and ultimately into `mart_ml_features`, which feeds the churn prediction model.

The on-call engineer was alerted at 06:50 UTC when the `monitoring_pipeline` DAG posted a Slack notification. The dbt generic test `not_null` on `stg_search_events.user_id` had been logging warnings (configured as `warn` severity) rather than failing the pipeline outright, so the data passed through.

### Impact

- 847 search events could not be attributed to any user, inflating anonymous session counts by 3.2%.
- The churn model training run at 08:00 UTC included corrupted feature rows, producing a model with AUC 0.81 (down from baseline 0.87).
- The Evidently drift detection report flagged `user_session_count` distribution shift with a Kolmogorov-Smirnov p-value of 0.003, triggering a drift alert in Grafana.
- Reverse-ETL pushed the degraded metrics to the PostgreSQL analytics database, which Metabase dashboards consumed for approximately 2 hours before rollback.

### Root Cause

The event generator's Kafka publisher (`event_generator/src/publishers/kafka_publisher.py`) received events from an upstream API that had deployed a schema change. The new schema made `user_id` optional for guest browsing sessions. The Kafka consumer (`kafka_consumer/src/consumer.py`) did not validate for nulls before writing to DuckDB because the raw layer intentionally accepts all data for auditability.

The dbt test on `stg_search_events.user_id` was configured with `severity: warn` rather than `severity: error`, meaning it logged the issue but did not halt the pipeline.

### Resolution

1. **06:50 UTC** -- `monitoring_pipeline` DAG alert fired in Slack. On-call engineer acknowledged.
2. **07:10 UTC** -- Engineer identified 847 null `user_id` rows via `dbt test --select stg_search_events` run manually.
3. **07:25 UTC** -- Paused the `transform_hourly` and `train_weekly` DAGs to prevent further propagation.
4. **08:15 UTC** -- Deleted corrupted rows from `raw.search_events` where `user_id IS NULL AND ingested_at > '2026-03-12 06:00'`.
5. **08:45 UTC** -- Ran `dbt build --select +mart_ml_features` to rebuild downstream models from clean data.
6. **09:30 UTC** -- Triggered manual churn model retrain via MLflow; new run achieved AUC 0.872.
7. **10:35 UTC** -- Verified Grafana drift dashboard showed no remaining anomalies. Resumed DAGs.

### Prevention

- Promoted the `not_null` dbt test on `stg_search_events.user_id` from `warn` to `error` severity so the pipeline halts on null user IDs.
- Added a `not_null` test on `user_id` in `int_search_sessions` as a second line of defense.
- Added input validation in `kafka_consumer/src/consumer.py` to reject events with null required fields before DuckDB insertion.
- Created a custom dbt generic test (`test_null_rate_below_threshold`) that fails when null rate exceeds 1% for any column marked as required, catching partial data quality degradation.
- Updated the `monitoring_pipeline` DAG to run the Evidently data quality report alongside the drift report, providing earlier detection of schema-level issues.

---

## Postmortem 2: Churn Model Accuracy Drop After Seasonal Shift

**Date:** 2026-02-28
**Duration:** 3 days (detected 2026-02-28, resolved 2026-03-02)
**Severity:** P3 -- Gradual model degradation, no data loss

### What Happened

Starting around 2026-02-15, the churn prediction model's live accuracy began declining. The weekly training pipeline (`train_weekly` DAG) retrained the model each Sunday, but performance continued to drop. By February 28, the model's AUC had fallen from a baseline of 0.874 to 0.831, and the F1 score dropped from 0.77 to 0.69.

The Evidently drift detection module (`ml_engine/src/drift/detector.py`) flagged feature drift on `adr` (average daily rate) and `total_stay_nights` on February 22, but the alert was treated as a transient fluctuation. On February 28, the `monitoring_pipeline` DAG's performance check crossed the configured AUC threshold of 0.84, triggering a P3 alert.

### Impact

- Churn predictions served by the ML Engine API (`/predict/churn`) had a 12% higher false-negative rate for two weeks, meaning churning users were incorrectly classified as retained.
- The search assistant (`search_assistant/`) provided overly optimistic churn risk assessments when users queried "which users are at risk of churning."
- Business stakeholders using the Metabase churn dashboard saw inflated retention forecasts, delaying proactive outreach to at-risk accounts.
- No data was lost or corrupted; the issue was purely model performance.

### Root Cause

A seasonal shift in booking behavior caused the input feature distributions to diverge from the training data. Specifically:

- `adr` (average daily rate) increased 18% due to spring break pricing, pushing the distribution well outside the training range.
- `total_stay_nights` shifted from a mean of 3.2 to 4.8 as longer vacation bookings replaced short business trips.
- `lead_time` compressed from a mean of 45 days to 22 days due to last-minute spring break bookings.

The model had been trained on data from October through January, which did not include spring seasonal patterns. The weekly retrain used a rolling 90-day window, but the seasonal shift happened faster than the window could adapt.

The Evidently drift report (`ml_engine/src/drift/detector.py`) correctly detected the distribution shifts on February 22 using the Kolmogorov-Smirnov test (p-values: `adr` = 0.008, `total_stay_nights` = 0.012, `lead_time` = 0.041). However, the drift alert was configured to require 3 consecutive flagged runs before escalating, and only 1 run had fired before the performance threshold was breached.

### Resolution

1. **Feb 28, 14:00 UTC** -- `monitoring_pipeline` DAG fired P3 alert: churn model AUC below 0.84 threshold.
2. **Feb 28, 15:30 UTC** -- Engineer reviewed MLflow experiment history; confirmed steady AUC decline over 4 weekly runs (0.874 -> 0.862 -> 0.849 -> 0.831).
3. **Feb 28, 16:00 UTC** -- Reviewed Evidently drift reports in MLflow artifacts; confirmed `adr`, `total_stay_nights`, and `lead_time` had drifted.
4. **Mar 1, 10:00 UTC** -- Expanded training window from 90 days to 180 days to include prior spring data from the reference dataset.
5. **Mar 1, 11:00 UTC** -- Triggered manual retrain via `ml_engine/train_churn.py` with the expanded window. New model: AUC 0.868, F1 0.75.
6. **Mar 1, 12:00 UTC** -- Deployed retrained model to the ML Engine API via MLflow model registry promotion.
7. **Mar 2, 08:00 UTC** -- Monitored one full day of live predictions; AUC stabilized at 0.871. Closed the incident.

### Prevention

- Reduced the Evidently drift escalation threshold from 3 consecutive flags to 1 flag for features with high model importance (SHAP value > 0.1).
- Added a `drift_score` metric to the `/monitor/drift` API endpoint so the React dashboard displays real-time drift status alongside model performance.
- Configured the `monitoring_pipeline` DAG to trigger an automatic retrain when drift is detected on 2 or more top-5 features simultaneously, rather than waiting for the weekly schedule.
- Added seasonal reference datasets to the drift detector: the Evidently report now compares against both a rolling 90-day window and a same-period-last-year reference, catching seasonal patterns earlier.
- Created a Grafana panel that overlays feature drift scores with model AUC on the same timeline, making the causal relationship between drift and performance degradation immediately visible.
