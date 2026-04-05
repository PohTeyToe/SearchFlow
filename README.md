# SearchFlow

End-to-end travel search analytics pipeline that tracks the search-to-booking funnel, predicts churn, and generates recommendations. Built to explore how modern data teams build analytics pipelines -- from event generation through ML-powered predictions, with real-time streaming, experiment tracking, and an AI-powered search assistant.

**Live Demo:** [Dashboard](https://dashboard-nine-lilac-71.vercel.app) | [ML API (Swagger)](https://searchflow-ml-api.onrender.com/docs)

![Python](https://img.shields.io/badge/Python-3.11-blue?logo=python&logoColor=white)
![React](https://img.shields.io/badge/React-18.3-61DAFB?logo=react&logoColor=black)
![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker&logoColor=white)
![Kafka](https://img.shields.io/badge/Kafka-4.0-231F20?logo=apachekafka&logoColor=white)
![MLflow](https://img.shields.io/badge/MLflow-3.x-0194E2?logo=mlflow&logoColor=white)
![LangChain](https://img.shields.io/badge/LangChain-LangGraph-1C3C3C?logo=langchain&logoColor=white)
![Tests](https://img.shields.io/badge/dbt%20tests-71%20passing-brightgreen)
![License](https://img.shields.io/badge/License-MIT-yellow)

```bash
git clone https://github.com/PohTeyToe/SearchFlow.git
cd SearchFlow && docker-compose up -d
# Dashboard: http://localhost:5173 | Airflow: http://localhost:8080 | ML API: http://localhost:8000
# MLflow UI: http://localhost:5000 | Search Assistant: http://localhost:8001
```

## Screenshots

| Dashboard (Dark) | Search Analytics |
|-------|-----------|
| ![Dashboard dark mode showing funnel metrics and charts](docs/images/dashboard-dark.png) | ![Search analytics with conversion tracking](docs/images/search-analytics.png) |

| Airflow DAGs | Metabase Dashboard |
|-------|-----------|
| ![Airflow DAG orchestration view](docs/images/airflow-dags.png) | ![Metabase analytics dashboard](docs/images/metabase-dashboard.png) |

---

## What It Does

Travel platforms lose most users between search and booking. SearchFlow captures the full funnel (search, click, booking), identifies where drop-off happens, and activates interventions:

- **Funnel tracking** -- Search, click, and conversion events with session context
- **Churn prediction** -- XGBoost model flags at-risk users with SHAP explanations
- **Recommendations** -- Hybrid collaborative + content-based filtering (SVD)
- **Real-time streaming** -- Kafka-based event pipeline with DuckDB analytics consumer
- **Experiment tracking** -- MLflow 3.x integration for model versioning and metrics
- **AI search assistant** -- LangChain/LangGraph agent for natural-language analytics queries
- **Batch analytics** -- PySpark session analysis and user segmentation
- **Reverse-ETL** -- Syncs insights back to CRM, email queue, and Redis cache

## Architecture

```
Events Generated --> Kafka Streaming --> Airflow Ingestion --> dbt Transform --> Reverse-ETL
       |                  |                                          |
       |            DuckDB Consumer                     fct_search_funnel (170 rows)
       |           (real-time analytics)                dim_users (1,607 rows)
       |                                                mart_user_segments (1,607 rows)
       |                                                mart_recommendations (67 rows)
       |
       +--> ML Engine (FastAPI) <-- MLflow Experiment Tracking
                  |
            Search Assistant (LangGraph Agent)
```

| Component | Technology |
|-|-|
| Orchestration | Airflow |
| Streaming | Apache Kafka 4.0 (KRaft mode) |
| Transformations | dbt-core + DuckDB |
| ML Serving | FastAPI + Redis |
| Experiment Tracking | MLflow 3.x |
| Recommendations | Scikit-learn SVD (hybrid CF + content-based) |
| Sentiment | TF-IDF baseline + PyTorch DistilBERT |
| Churn | XGBoost + SHAP |
| Batch Analytics | PySpark |
| AI Assistant | LangChain + LangGraph + Claude |
| Dashboard | React + TypeScript + Recharts |
| Load Testing | Locust |

## ML Engine

Three models served via FastAPI with Redis caching:

| Model | Algorithm | Purpose |
|-|-|-|
| Recommendations | Hybrid CF + Content-based (SVD) | Personalized destination suggestions |
| Sentiment | TF-IDF + DistilBERT | Review classification |
| Churn | XGBoost + SHAP | Propensity scoring with explainability |

```bash
# Get recommendations
curl -X POST http://localhost:8000/recommend/user_123

# Analyze sentiment
curl -X POST http://localhost:8000/sentiment -d '{"text": "Amazing hotel!"}'

# Predict churn
curl -X POST http://localhost:8000/churn/user_456
```

### PyTorch Training

```bash
cd ml_engine
python -m src.models.train_sentiment_pytorch --samples 5000 --epochs 5
```

### PySpark Jobs

```bash
docker-compose exec spark spark-submit /app/session_analysis.py --data-dir /data/raw
docker-compose exec spark spark-submit /app/user_segmentation.py
```

## Real-Time Streaming

Kafka 4.0 in KRaft mode (no ZooKeeper) powers the event streaming pipeline. The event generator publishes search, click, and booking events to Kafka topics, and the consumer writes aggregated analytics to DuckDB.

```bash
# Events flow automatically when services are running
docker-compose logs -f kafka-consumer

# Kafka is available at localhost:9092
```

- **Producer:** Event generator publishes to `search_events` topic via `confluent-kafka`
- **Consumer:** Reads events, computes session metrics, writes to DuckDB
- **Format:** JSON messages with event type, user ID, session context, and timestamps

## ML Experiment Tracking

MLflow 3.x tracks all model training runs with metrics, parameters, and artifacts. The training DAG logs experiments automatically.

```bash
# MLflow UI
open http://localhost:5000

# Training with experiment tracking
docker-compose exec ml-engine python -m src.models.train_recommendation
docker-compose exec ml-engine python -m src.models.train_churn
```

- **Metrics:** Accuracy, F1, RMSE, training duration
- **Artifacts:** Trained model files, SHAP plots, feature importance
- **Comparison:** Side-by-side run comparison in the MLflow UI

## AI Search Assistant

Natural-language interface for querying search analytics, powered by LangChain and LangGraph with Claude as the LLM backend.

```bash
# Query the assistant
curl -X POST http://localhost:8001/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "What is the conversion rate for hotel searches?"}'

# Check health
curl http://localhost:8001/health
```

- **Tools:** Funnel analysis, user segmentation, churn predictions, recommendations
- **Agent:** LangGraph ReAct agent with tool-calling and conversation memory
- **Backends:** Anthropic API or Claude CLI (configurable via `LLM_BACKEND`)

## Architecture Decisions

Key design choices and the reasoning behind them:

- **FastAPI over Flask/Django for ML serving** -- FastAPI's async support handles concurrent prediction requests without blocking, and its automatic OpenAPI documentation means the ML API is self-documenting. Pydantic validation catches malformed requests before they hit the model.

- **dbt for data transformations** -- Version-controlled SQL transformations with built-in testing (schema tests, data tests) and automatic documentation. Easier to audit and debug than raw SQL scripts or pandas pipelines for the transformation layer.

- **Redis for prediction caching** -- Sub-millisecond reads for repeated predictions on the same input. TTL-based expiration keeps cache fresh without manual invalidation. Simple key-value model fits the input-hash → prediction-result pattern.

- **Kafka 4.0 with KRaft mode** -- Eliminates the ZooKeeper dependency, simplifying the deployment to a single Kafka container. KRaft provides built-in consensus for metadata management. The `confluent-kafka` Python client offers high-throughput, low-latency message production and consumption.

- **MLflow 3.x for experiment tracking** -- Centralized tracking of model metrics, parameters, and artifacts across training runs. The MLflow UI enables visual comparison of experiments, and the artifact store preserves model lineage for reproducibility.

- **LangGraph ReAct agent for search assistant** -- LangGraph's graph-based orchestration provides structured tool-calling with built-in state management. The ReAct pattern lets the agent reason about which analytics tools to invoke, and conversation memory maintains context across multi-turn interactions.

- **Claude CLI as LLM backend option** -- Enables local development without API keys by using the Claude CLI subscription. Reduces cost during development while maintaining the same tool-calling interface as the Anthropic API.

- **Monorepo with Docker Compose** -- Single `docker-compose up` starts all 14 services. Shared networking simplifies service discovery. Easier to develop and test locally than separate repos with inter-service dependencies.

## Quick Start

```bash
# Using Make
cd SearchFlow
make setup && make start && make demo

# Manual
cp env.example .env
docker-compose build && docker-compose up -d
docker-compose exec event-generator python -m src.main --count 10000
docker-compose exec airflow-scheduler airflow dags trigger searchflow_ingestion
docker-compose exec airflow-scheduler airflow dags trigger searchflow_transformation
docker-compose exec airflow-scheduler airflow dags trigger searchflow_reverse_etl

# Dashboard (optional)
cd dashboard && npm install && npm run dev
```

**URLs:**
- Dashboard: http://localhost:5173
- Airflow: http://localhost:8080 (admin/admin)
- ML API: http://localhost:8000
- MLflow UI: http://localhost:5000
- Search Assistant: http://localhost:8001
- Metabase: http://localhost:3000

## Performance

| Metric | Value |
|-|-|
| End-to-end pipeline | ~68 seconds |
| dbt models | 9/9 passing |
| dbt tests | 71 |
| Python tests | 110 (pytest) |
| Docker services | 14 |

## Testing

```bash
cd ml_engine && python -m pytest tests/ -v
cd event_generator && python -m pytest tests/ -v
cd reverse_etl && python -m pytest tests/ -v
cd kafka_consumer && python -m pytest tests/ -v
cd search_assistant && python -m pytest tests/ -v

# Load testing
./benchmarks/run_benchmark.sh http://localhost:8000 100 10 60s
```

## Project Structure

```
SearchFlow/
├── event_generator/       # Synthetic search traffic simulation (Kafka producer)
├── airflow/               # DAG orchestration (ingestion, transform, reverse-ETL, training)
├── dbt_transform/         # SQL transformations (staging -> intermediate -> marts)
├── ml_engine/             # Recommendations, sentiment, churn (FastAPI + MLflow)
├── spark/                 # PySpark batch analytics
├── reverse_etl/           # Sync marts to CRM, email queue, Redis
├── kafka_consumer/        # Real-time Kafka consumer with DuckDB analytics
├── search_assistant/      # AI search assistant (LangChain + LangGraph)
├── dashboard/             # React + TypeScript monitoring UI
├── warehouse/             # DuckDB schema init
├── benchmarks/            # Locust load testing
└── scripts/               # Setup and demo utilities
```

## Docs

- [Architecture](docs/ARCHITECTURE.md)
- [Data Schemas](docs/DATA_SCHEMAS.md)
- [ML Engine](docs/ML_ENGINE.md)
- [Implementation Guide](docs/IMPLEMENTATION_GUIDE.md)
- [Troubleshooting](docs/TROUBLESHOOTING.md)

## Deployment

### Dashboard (Vercel)
The React dashboard can be deployed to Vercel directly from the `dashboard/` directory:
1. Connect the repository on [Vercel](https://vercel.com)
2. Set the root directory to `dashboard`
3. Framework preset: Vite
4. Deploy

### ML API (Render)
The FastAPI ML engine can be deployed to Render:
1. Connect the repository on [Render](https://render.com)
2. Select "Docker" runtime
3. Set Dockerfile path to `ml_engine/Dockerfile`
4. Configure environment variables (see `.env.example`)

See live links at the top of this README.

## Known Issues

- Redis cache invalidation is TTL-based only -- no event-driven invalidation when models are retrained
- PySpark jobs run in local mode; cluster deployment would need Spark standalone or YARN configuration
- ML model serving doesn't support batch predictions (single-request only via REST)
- Dashboard auth is placeholder -- no actual user authentication implemented
- Event generator timestamps use system clock, which can drift in containerized environments
- DuckDB write contention -- Kafka consumer and dbt transforms should not write simultaneously
- Search assistant requires an Anthropic API key or Claude CLI subscription for LLM backend

## Roadmap

- [ ] Batch prediction endpoint for bulk inference requests
- [ ] Grafana + Prometheus monitoring for ML model performance metrics
- [ ] Airflow DAG integration for PySpark jobs (currently manual execution)
- [ ] Model A/B testing framework for comparing prediction quality across versions

---

[MIT License](LICENSE)
