# Architecture Decision Records

This document captures the key technology decisions made during SearchFlow's development.
Each ADR explains the context, decision, rationale, consequences, and conditions that would
trigger revisiting the choice.

---

## ADR-001: DuckDB over PostgreSQL for Analytics

### Context

SearchFlow needs an analytics warehouse for dbt transformations, ML feature engineering,
and dashboard queries. The two candidates were PostgreSQL (already used by Airflow metadata
and reverse-ETL target) and DuckDB (embedded columnar database).

### Decision

Use DuckDB as the primary analytics warehouse. PostgreSQL remains in the stack for
transactional workloads (Airflow metadata, reverse-ETL CRM target) but does not serve
analytical queries.

### Rationale

- **Columnar storage**: Analytics queries scan few columns across many rows. DuckDB's
  columnar format reads only the columns referenced in a query, reducing I/O by 5-10x
  compared to PostgreSQL's row-oriented storage on typical aggregation queries.
- **Zero infrastructure**: DuckDB runs in-process. No TCP connections, no connection
  pooling, no authentication configuration, no separate container. The database is a
  single file on disk.
- **dbt compatibility**: `dbt-duckdb` adapter supports the full dbt feature set including
  seeds, snapshots, and incremental models. SQL syntax differences from PostgreSQL are
  minimal (DuckDB supports most PostgreSQL syntax natively).
- **Development speed**: `pip install duckdb` and the warehouse is ready. No Docker
  container startup, no schema migration, no pg_dump for backups (just copy the file).
- **Performance at current scale**: 100K rows across all tables. DuckDB processes the
  full dbt DAG in under 2 seconds. PostgreSQL would also be fast at this scale, but DuckDB
  eliminates all operational overhead.

### Consequences

- **Single-writer limitation**: DuckDB uses exclusive write locks. Only one process can
  write at a time. The Kafka consumer and dbt cannot write simultaneously.
- **No concurrent connections**: The dashboard cannot query DuckDB while dbt is running.
  This is acceptable because dbt runs take <2 seconds.
- **File-based durability**: DuckDB does not have WAL-based crash recovery like PostgreSQL.
  Data loss is possible if the process crashes mid-write. Mitigated by Kafka replay
  (source of truth) and dbt idempotency (re-run rebuilds all tables).

### When to Revisit

Migrate to ClickHouse when any of:
- Multiple services need concurrent write access
- Dataset exceeds 10M rows (DuckDB starts hitting memory pressure)
- Query latency exceeds 5 seconds on dashboard queries
- Team size grows beyond solo developer (need multi-user access)

See [SCALE.md](SCALE.md) for the ClickHouse migration plan.

---

## ADR-002: Skip Feast Feature Store (dbt Marts Sufficient)

### Context

ML models need feature engineering: transforming raw events into model-ready features
(days since last search, total searches, conversion rate, etc.). Feast is the standard
open-source feature store for managing ML features with point-in-time correctness, feature
serving, and feature registry.

### Decision

Use dbt mart models (`mart_ml_features`) as the feature store instead of deploying Feast.

### Rationale

- **Feature complexity is low**: SearchFlow's churn model uses 8 features, all derivable
  from SQL aggregations over the events table. There are no complex time-windowed features
  requiring point-in-time joins.
- **Batch-only serving**: All predictions run in batch (Airflow training DAG) or on-demand
  via the FastAPI endpoint. There is no real-time feature lookup during inference -- the
  ML Engine loads pre-computed features from the mart table.
- **dbt already runs**: The transformation pipeline is already built in dbt. Adding a
  Feast layer would require duplicating feature definitions in both dbt SQL and Feast
  Python, creating two sources of truth.
- **Operational overhead**: Feast requires a feature registry (SQLite or PostgreSQL), an
  online store (Redis or DynamoDB), and an offline store (BigQuery or Redshift). Each
  component adds configuration, monitoring, and failure modes.

### Consequences

- **No point-in-time correctness**: Training features are computed from current data, not
  historical snapshots. This means training data may have subtle leakage if a user's
  features changed between the label event and the feature computation. At current scale
  with synthetic data, this is not a concern.
- **No feature versioning**: dbt tracks model versions via git, but there is no automatic
  feature lineage or compatibility checking between model versions.
- **No online serving**: Features are read from DuckDB at prediction time (~5ms). A proper
  feature store would serve from Redis (<1ms). The 4ms difference is negligible.

### When to Revisit

Add Feast when:
- Feature count exceeds 50 per model
- Multiple ML teams need to share and discover features
- Real-time features are needed (e.g., "searches in last 5 minutes" computed at serving time)
- Point-in-time correctness becomes critical (actual user data, not synthetic)

---

## ADR-003: Skip Great Expectations (dbt Contracts + Evidently)

### Context

Data quality validation is critical for ML pipelines -- garbage features produce garbage
predictions. Great Expectations (GE) is the standard Python framework for data validation
with 300+ built-in expectations, data docs, and checkpoint orchestration.

### Decision

Use dbt's built-in testing framework for schema validation and Evidently AI for ML-specific
data drift detection. Do not deploy Great Expectations.

### Rationale

- **dbt tests cover schema validation**: `not_null`, `unique`, `accepted_values`, and
  `relationships` tests validate 90% of data quality requirements. Custom generic tests
  handle the remaining 10% (e.g., `positive_value`, `date_not_future`).
- **dbt contracts (v1.5+)**: Model contracts enforce column names, types, and constraints
  at build time. A contract violation fails the dbt run before bad data reaches downstream
  models.
- **Evidently handles drift**: ML-specific concerns (feature drift, prediction drift, data
  quality over time) are better served by Evidently, which generates visual reports and
  integrates with MLflow for tracking drift metrics alongside model metrics.
- **GE is heavyweight**: Great Expectations requires a Data Context directory structure,
  YAML configuration for datasources and checkpoints, and generates a static HTML site
  for data docs. The learning curve and maintenance overhead are disproportionate to
  SearchFlow's 71 dbt tests and 4 Evidently drift reports.
- **Tooling overlap**: GE + dbt tests + Evidently would create three places to define
  data expectations. Two (dbt + Evidently) is already pushing it.

### Consequences

- **No row-level validation**: dbt tests operate on columns, not individual rows. A row
  with an invalid combination of valid column values would pass dbt tests. GE's
  multi-column expectations would catch this.
- **No data docs**: Great Expectations generates browsable HTML documentation of all
  expectations and validation results. dbt provides test results in the CLI and
  `dbt docs generate` covers schema documentation.

### When to Revisit

Add Great Expectations when:
- Data sources are external and untrusted (partner feeds, third-party APIs)
- Row-level validation rules exceed what dbt custom tests can express
- Regulatory compliance requires auditable data quality documentation

---

## ADR-004: Kafka 4.0 KRaft Mode (No ZooKeeper)

### Context

SearchFlow uses Apache Kafka for event streaming between the event generator, consumer,
and Airflow. Kafka historically required Apache ZooKeeper for broker coordination,
controller election, and topic metadata management.

### Decision

Deploy Kafka 4.0 in KRaft (Kafka Raft) mode, which eliminates the ZooKeeper dependency
entirely.

### Rationale

- **Simplified deployment**: One container instead of two. The Docker Compose stack does
  not need a ZooKeeper service, its health checks, or its volume mounts. This removes
  a container, a network dependency, and a failure mode.
- **Faster startup**: KRaft mode initializes the metadata quorum in-process. Kafka is
  ready to accept connections in ~3 seconds vs ~10 seconds with ZooKeeper handshake.
- **Better partition scaling**: ZooKeeper stored partition metadata in znodes with a
  practical limit of ~200K partitions per cluster. KRaft stores metadata in an internal
  topic with no such limit.
- **Production readiness**: KRaft was marked production-ready in Kafka 3.3 (October 2022).
  Kafka 4.0 removed ZooKeeper entirely -- it is no longer an option, only KRaft.
- **Reduced resource usage**: ZooKeeper requires 512MB-1GB heap. Eliminating it frees
  those resources for actual message processing.

### Consequences

- **No ZooKeeper ecosystem tools**: Some Kafka management UIs (Kafka Manager, CMAK) were
  built for ZooKeeper-based clusters. KRaft-compatible alternatives exist (Kafka UI,
  Redpanda Console) but the ecosystem is smaller.
- **Newer documentation**: Most Kafka tutorials and Stack Overflow answers assume ZooKeeper.
  KRaft configuration differs (e.g., `KAFKA_PROCESS_ROLES`, `KAFKA_CONTROLLER_QUORUM_VOTERS`).

### When to Revisit

This decision is permanent. ZooKeeper mode is no longer available in Kafka 4.0+.

---

## ADR-005: XGBoost over Deep Learning for Churn

### Context

The churn prediction model needs to classify users as likely-to-churn based on behavioral
features (search frequency, conversion rate, days since last activity, etc.). Options
evaluated: logistic regression, random forest, XGBoost, and neural network (PyTorch MLP).

### Decision

Use XGBoost as the primary churn prediction model.

### Rationale

- **Tabular data performance**: On structured/tabular datasets, gradient-boosted trees
  consistently match or outperform neural networks. Multiple benchmarks (Grinsztajn et al.
  2022, "Why do tree-based models still outperform deep learning on tabular data?")
  confirm this across hundreds of datasets.
- **Training speed**: XGBoost trains on SearchFlow's dataset (~1,600 users, 8 features)
  in <1 second. A PyTorch MLP with comparable accuracy requires 50+ epochs at ~2 seconds
  per epoch = ~100 seconds. This matters for weekly retraining and hyperparameter sweeps.
- **SHAP explainability**: TreeSHAP computes exact Shapley values for tree models in
  O(TLD) time (T trees, L leaves, D depth). DeepSHAP for neural networks is approximate
  and 10-100x slower. SHAP explanations are a core SearchFlow feature (the dashboard
  shows per-user SHAP waterfall charts).
- **Deployment simplicity**: XGBoost models serialize to JSON (~5 MB). Loading and
  inference requires only `xgboost` (no GPU runtime, no CUDA, no torch). The FastAPI
  container image stays small (~200 MB vs ~2 GB with PyTorch).
- **Interpretability**: Stakeholders can inspect feature importance rankings and
  individual SHAP plots to understand and trust predictions. Neural network predictions
  are opaque without additional explanation tooling.

### Consequences

- **Feature engineering matters more**: XGBoost cannot learn feature interactions as
  flexibly as neural networks. The model relies on hand-crafted features in the dbt
  mart (interaction terms, ratios, binned values).
- **No transfer learning**: Cannot fine-tune a pre-trained model on related domains.
  Each deployment trains from scratch on its own data.
- **Diminishing returns at scale**: With millions of training examples and hundreds of
  features, deep learning may outperform XGBoost. But SearchFlow's feature space is
  deliberately small (8 features) for explainability.

### When to Revisit

Consider deep learning when:
- Feature count exceeds 100 (high-dimensional embeddings from text/images)
- Training data exceeds 1M rows (deep learning benefits from scale)
- Explainability is no longer a hard requirement

---

## ADR-006: Mock-First Frontend

### Context

The React dashboard needs data to display: metrics, user tables, SHAP charts, pipeline
statuses, and AI assistant responses. Two approaches: (1) build backend APIs first, then
connect the frontend, or (2) build the frontend with realistic mock data, deploy it
independently, then connect to real APIs later.

### Decision

Build the dashboard entirely on mock data. Deploy to Vercel as a standalone application
that requires no backend services to function.

### Rationale

- **Parallel development**: Frontend and backend development proceed independently. The
  dashboard was deployed and demo-ready before the ML API was stable.
- **Demo availability**: The live demo works for anyone with a browser. No Docker setup,
  no API keys, no database initialization. Recruiters and hiring managers see the full
  experience in one click.
- **Design iteration speed**: Changing mock data to test edge cases (empty states, extreme
  values, error states) is a one-line change. Reproducing edge cases with a real backend
  requires database manipulation.
- **Deterministic screenshots**: Mock data produces identical renders every time. The
  demo GIF and screenshots are reproducible without timing-dependent real data.
- **Reduced scope coupling**: A bug in the Kafka consumer does not break the dashboard
  demo. Each component has independent reliability.

### Consequences

- **Mock-real divergence**: Mock data may not match real API response shapes as the backend
  evolves. Mitigated by TypeScript interfaces that both mock generators and API clients
  share.
- **Missing real-time behavior**: The mock "live events feed" simulates real-time with
  `setInterval`. Real Kafka events would use WebSocket or SSE, which requires different
  frontend plumbing.
- **Two data paths**: Components that work with mock data must be tested again with real
  APIs. The API integration is behind a `VITE_API_URL` environment variable that switches
  between mock and real data sources.

### When to Revisit

Connect to real APIs when:
- The ML API is deployed and stable on Render
- End-to-end integration testing is a priority
- Real-time features (WebSocket event stream) are implemented

---

## ADR-007: LangGraph over Vanilla LangChain

### Context

The Search Assistant is an AI-powered analytics agent that answers natural-language
questions about the data ("Which users are most likely to churn?", "What is the average
conversion rate by segment?"). LangChain provides the foundation, but the agent
architecture choice matters: vanilla LangChain agent (AgentExecutor) vs LangGraph
(graph-based agent with explicit state management).

### Decision

Use LangGraph's ReAct agent with explicit state management instead of LangChain's
legacy AgentExecutor.

### Rationale

- **Explicit control flow**: LangGraph models the agent as a state machine with typed
  state. Each node (think, act, observe) is a function that receives and returns state.
  This makes the agent's decision process inspectable and debuggable.
- **Tool calling reliability**: LangGraph's tool-calling interface uses the model's native
  function-calling API (Claude's tool_use) instead of string-parsing. This eliminates
  the "could not parse LLM output" errors common with AgentExecutor's output parser.
- **Multi-turn state**: LangGraph maintains conversation state across turns with a
  checkpointer. The agent remembers previous queries and results within a session,
  enabling follow-up questions like "now filter that by segment."
- **Error recovery**: Graph nodes can catch tool errors and route to a retry node or
  a fallback response. AgentExecutor's error handling is limited to a max_iterations
  timeout.
- **LangChain direction**: LangGraph is LangChain's recommended architecture for agents
  as of 2024. AgentExecutor is in maintenance mode.

### Consequences

- **Higher complexity**: LangGraph requires defining a StateGraph, nodes, edges, and
  conditional routing. AgentExecutor is a single class instantiation. The Search Assistant
  has ~80 more lines of code than an equivalent AgentExecutor implementation.
- **Newer ecosystem**: LangGraph documentation and community examples are less extensive
  than AgentExecutor. Debugging often requires reading source code.

### When to Revisit

This decision is forward-looking -- LangGraph is the active development path for
LangChain agents. No reason to revisit unless a fundamentally different agent framework
emerges.

---

## ADR-008: Schema Registry Deferred

### Context

Kafka events are serialized as JSON. As the event schema evolves (new fields, renamed
fields, type changes), producers and consumers must stay compatible. A Schema Registry
(Confluent Schema Registry or Apicurio) enforces schema compatibility at the broker level,
rejecting messages that violate the registered schema.

### Decision

Defer Schema Registry deployment. Enforce schema compatibility through application-level
validation (Pydantic models in the producer and consumer).

### Rationale

- **Single producer, single consumer**: SearchFlow has one event generator and one Kafka
  consumer. Schema changes are made in one codebase and consumed in one codebase. The
  risk of incompatible schema evolution is low.
- **Pydantic validation**: Both the producer (event_generator) and consumer (kafka_consumer)
  use Pydantic models to serialize and deserialize events. A schema mismatch causes a
  Pydantic ValidationError with a clear error message, caught at the application level.
- **Development velocity**: Schema Registry adds a service to Docker Compose, requires
  schema registration before producing messages, and introduces a compatibility mode
  configuration (BACKWARD, FORWARD, FULL). This overhead is not justified for a single
  developer iterating on event schemas.
- **JSON simplicity**: JSON events are human-readable in Kafka logs, debuggable with
  `kafkacat`, and parseable by any consumer regardless of language. Avro/Protobuf
  (typically used with Schema Registry) require schema-aware deserialization.

### Consequences

- **No backward compatibility enforcement**: Nothing prevents a producer change from
  breaking the consumer. A renamed field silently becomes `null` in the consumer's
  Pydantic model (if the field is Optional) or raises a ValidationError (if required).
- **No schema evolution history**: There is no central registry of which schema versions
  exist, when they changed, or which consumers are on which version.
- **Larger message size**: JSON is 2-5x larger than Avro for equivalent payloads. At
  10M events/day with 512-byte average JSON messages, this is ~5 GB/day vs ~1.5 GB/day
  with Avro. Not material at current scale, but compounds at production volumes.

### When to Revisit

Add Schema Registry when:
- Multiple teams produce events to shared topics
- Event schema changes more than once per month
- Message size becomes a cost concern (network egress, storage)
- Regulatory requirements mandate schema lineage and auditability
