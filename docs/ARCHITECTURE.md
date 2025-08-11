# Architecture Deep Dive

## Overview

SearchFlow is a modern data platform that simulates a real-world search analytics system. It demonstrates the complete lifecycle of data from event generation through transformation to operational activation.

---

## System Components

### 1. Event Generation Layer

**Component**: `event_generator/`

**Responsibility**: Simulate realistic user behavior on a travel search platform.

**Design Decisions**:
- **Stateful user simulation**: Users have persistent IDs and behavioral patterns
- **Realistic funnels**: 30% CTR, 10% conversion rate (industry benchmarks)
- **Time-based patterns**: Peak hours, weekday vs weekend, seasonality
- **Configurable throughput**: Scale from 10 events/sec (local) to 1000+/sec

**Data Flow**:
```
User Simulation Engine
        │
        ▼
┌───────────────────┐
│  Event Factory    │
│  • SearchEvent    │
│  • ClickEvent     │
│  • ConversionEvent│
└───────────────────┘
        │
        ▼
┌───────────────────┐
│  Publisher        │
│  • Redis Streams  │
│  • JSON Files     │
│  • Direct DB      │
└───────────────────┘
```

---

### 2. Ingestion Layer

**Component**: `airflow/dags/ingestion_dag.py`

**Responsibility**: Move data from event sources to raw warehouse tables.

**Design Principles**:
- **Idempotent operations**: Re-running doesn't create duplicates
- **Exactly-once semantics**: Event IDs tracked to prevent double-processing
- **Late-arriving data**: 24-hour lookback window
- **Schema evolution**: JSON payload allows adding fields without migrations

**DAG Structure**:
```
[sensor: check_new_events]
            │
            ▼
    ┌───────┴───────┐
    │               │
    ▼               ▼
[ingest_     [ingest_      [ingest_
 searches]    clicks]       conversions]
    │               │               │
    └───────┬───────┴───────────────┘
            ▼
    [log_metrics]
```

---

### 3. Transformation Layer (dbt)

**Component**: `dbt_transform/`

**Responsibility**: Transform raw events into analytics-ready models.

**Layer Architecture**:

```
┌─────────────────────────────────────────────────────────────────┐
│                        MARTS (Business-Ready)                    │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  │
│  │ fct_search_     │  │ mart_user_      │  │ mart_campaign_  │  │
│  │ funnel          │  │ segments        │  │ attribution     │  │
│  └────────┬────────┘  └────────┬────────┘  └────────┬────────┘  │
└───────────┼────────────────────┼────────────────────┼───────────┘
            │                    │                    │
┌───────────┼────────────────────┼────────────────────┼───────────┐
│           │        INTERMEDIATE (Business Logic)    │           │
│  ┌────────┴────────┐  ┌────────┴────────┐                       │
│  │ int_search_     │  │ int_user_       │                       │
│  │ sessions        │  │ journeys        │                       │
│  └────────┬────────┘  └────────┬────────┘                       │
└───────────┼────────────────────┼────────────────────────────────┘
            │                    │
┌───────────┼────────────────────┼────────────────────────────────┐
│           │          STAGING (Cleaned, Typed)                   │
│  ┌────────┴────────┐  ┌────────┴────────┐  ┌─────────────────┐  │
│  │ stg_search_     │  │ stg_click_      │  │ stg_conversion_ │  │
│  │ events          │  │ events          │  │ events          │  │
│  └────────┬────────┘  └────────┬────────┘  └────────┬────────┘  │
└───────────┼────────────────────┼────────────────────┼───────────┘
            │                    │                    │
┌───────────┴────────────────────┴────────────────────┴───────────┐
│                         RAW (Append-Only)                        │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  │
│  │ raw_search_     │  │ raw_click_      │  │ raw_conversion_ │  │
│  │ events          │  │ events          │  │ events          │  │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

**Materialization Strategy**:
| Layer | Materialization | Reason |
|-------|----------------|--------|
| Staging | View | No storage cost, always fresh |
| Intermediate | Ephemeral or View | Intermediate calculations |
| Marts (facts) | Incremental | Performance on large tables |
| Marts (dims) | Table | Full refresh is fast |

---

### 4. Reverse-ETL Layer

**Component**: `reverse_etl/`

**Responsibility**: Sync transformed data BACK to operational systems.

**Why This Matters**:
Traditional ETL: Source Systems → Warehouse → Reports
Modern Data Stack: Source Systems → Warehouse → **Operational Systems**

This "closing the loop" enables:
- Real-time personalization
- Automated marketing triggers
- ML model deployment

**Sync Patterns**:

```
┌─────────────────┐         ┌─────────────────┐
│   Warehouse     │         │  Operational    │
│   (DuckDB)      │────────▶│   Systems       │
└─────────────────┘         └─────────────────┘
        │                           │
        │                           ▼
        │                   ┌───────────────┐
        │                   │ CRM Table     │
        │                   │ (user_segments│
        │                   │  for sales)   │
        │                   └───────────────┘
        │                           │
        │                           ▼
        │                   ┌───────────────┐
        │                   │ Email Queue   │
        │                   │ (abandoned    │
        │                   │  search       │
        │                   │  triggers)    │
        │                   └───────────────┘
        │                           │
        │                           ▼
        │                   ┌───────────────┐
        │                   │ Redis Cache   │
        │                   │ (reco scores  │
        │                   │  for search)  │
        │                   └───────────────┘
```

---

### 5. Presentation Layer

**Component**: `dashboards/` (Metabase)

**Dashboards**:

1. **Executive Overview**
   - Daily/weekly/monthly KPIs
   - Revenue and conversion trends
   - YoY comparisons

2. **Search Funnel Analysis**
   - Funnel visualization: Searches → Clicks → Conversions
   - Breakdown by platform, device, geo
   - Drop-off analysis

3. **Marketing Attribution**
   - Performance by utm_source/campaign
   - ROAS by channel
   - First-touch vs last-touch attribution

4. **User Segments**
   - Segment distribution over time
   - Segment transition analysis
   - High-value user characteristics

---

## Data Flow Diagram

```
                    ┌─────────────────────────────────────────────────────────────────┐
                    │                                                                 │
                    │                         SEARCHFLOW                              │
                    │                                                                 │
┌──────────────┐    │    ┌──────────────┐    ┌──────────────┐    ┌──────────────┐    │
│              │    │    │              │    │              │    │              │    │
│    User      │────┼───▶│   Event      │───▶│    Redis     │───▶│   Airflow    │    │
│  Simulation  │    │    │  Generator   │    │   Streams    │    │  Ingestion   │    │
│              │    │    │              │    │              │    │              │    │
└──────────────┘    │    └──────────────┘    └──────────────┘    └──────┬───────┘    │
                    │                                                   │            │
                    │                                                   ▼            │
                    │                                           ┌──────────────┐     │
                    │                                           │              │     │
                    │                                           │   DuckDB     │     │
                    │                                           │  (Raw Tables)│     │
                    │                                           │              │     │
                    │                                           └──────┬───────┘     │
                    │                                                  │             │
                    │                                                  ▼             │
                    │    ┌──────────────┐                       ┌──────────────┐     │
                    │    │              │                       │              │     │
                    │    │   Airflow    │◀──────────────────────│     dbt      │     │
                    │    │   Scheduler  │                       │   Models     │     │
                    │    │              │──────────────────────▶│              │     │
                    │    └──────────────┘                       └──────┬───────┘     │
                    │                                                  │             │
                    │           │                                      │             │
                    │           │                                      ▼             │
                    │           │                              ┌──────────────┐      │
                    │           │                              │   DuckDB     │      │
                    │           │                              │  (Marts)     │      │
                    │           │                              └──────┬───────┘      │
                    │           │                                     │              │
                    │           ▼                                     │              │
                    │    ┌──────────────┐                             │              │
                    │    │              │                             │              │
                    │    │  Reverse-ETL │◀────────────────────────────┘              │
                    │    │   Service    │                                            │
                    │    │              │                                            │
                    │    └──────┬───────┘                                            │
                    │           │                                                    │
                    │           ▼                                                    │
                    │    ┌──────────────┐    ┌──────────────┐    ┌──────────────┐   │
                    │    │    CRM       │    │   Email      │    │    Redis     │   │
                    │    │   Table      │    │   Queue      │    │   Cache      │   │
                    │    │ (Segments)   │    │ (Triggers)   │    │  (Recos)     │   │
                    │    └──────────────┘    └──────────────┘    └──────────────┘   │
                    │                                                               │
                    │    ┌──────────────────────────────────────────────────────┐   │
                    │    │                      Metabase                         │   │
                    │    │                     Dashboards                        │   │
                    │    └──────────────────────────────────────────────────────┘   │
                    │                                                               │
                    └───────────────────────────────────────────────────────────────┘
```

---

## Scalability Considerations

### Current (Local Development)
- 10 events/second
- ~100K events/day
- Single DuckDB instance
- Docker Compose orchestration

### Production Path (Documented)
- 1000+ events/second
- 10M+ events/day
- Snowflake data warehouse
- Kubernetes orchestration
- Kafka for event streaming

**The code is written to be production-ready** with:
- Environment-based configuration
- Incremental processing patterns
- Partitioning strategies documented
- Connection pooling

---

## Security Considerations

Even for a portfolio project, demonstrate security awareness:

1. **No hardcoded credentials** - Use environment variables
2. **PII handling** - User IDs are anonymized in public demos
3. **Access patterns** - Document who should access what tables
4. **Audit logging** - Track data access and modifications

---

## Monitoring & Observability

### Airflow Metrics
- DAG run duration
- Task success/failure rates
- SLA misses

### dbt Metrics
- Model run times
- Test pass rates
- Data freshness

### Application Metrics
- Events processed per minute
- Reverse-ETL sync latency
- Error rates by component

---

## Failure Handling

### Event Generator Failure
- Redis acts as buffer (survives restarts)
- Airflow sensor waits for data (no empty runs)

### Ingestion Failure
- Idempotent writes (safe to retry)
- Dead letter queue for malformed events

### Transformation Failure
- dbt `--fail-fast` mode for quick feedback
- Partial success handling (some models may succeed)

### Reverse-ETL Failure
- Incremental syncs (only sync changes)
- Reconciliation job for drift detection
