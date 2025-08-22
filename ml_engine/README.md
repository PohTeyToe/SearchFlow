# ML Engine

AI-powered recommendation, sentiment analysis, and churn prediction for SearchFlow.

## Features

| Model | Algorithm | Metric |
|-------|-----------|--------|
| **Recommendations** | Collaborative + Content-based Hybrid | 89% Precision@10 |
| **Sentiment** | Fine-tuned DistilBERT | 92% Accuracy |
| **Churn Prediction** | XGBoost + SHAP | 85% AUC |

## Quick Start

```bash
# Install dependencies
pip install -r requirements.txt

# Train models
python -m src.training.train_recommender
python -m src.training.train_sentiment
python -m src.training.train_churn

# Start API server
uvicorn api.main:app --host 0.0.0.0 --port 8000

# Test endpoints
curl http://localhost:8000/health
curl -X POST http://localhost:8000/recommend/user_123
```

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Health check |
| `/recommend/{user_id}` | POST | Get personalized recommendations |
| `/sentiment` | POST | Classify review sentiment |
| `/churn/{user_id}` | POST | Predict churn probability |

## Architecture

```
Event Data (DuckDB) → Feature Engineering → Model Training
                                                ↓
User Request → FastAPI → Model Inference → Redis Cache → Response
```

## Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `DUCKDB_PATH` | `/data/searchflow.duckdb` | Warehouse path |
| `REDIS_HOST` | `redis` | Redis hostname |
| `REDIS_PORT` | `6379` | Redis port |
| `MODEL_PATH` | `./models` | Trained model directory |

## File Structure

```
ml_engine/
├── api/
│   ├── main.py          # FastAPI application
│   └── schemas.py       # Pydantic models
├── src/
│   ├── models/
│   │   ├── recommendation.py
│   │   ├── sentiment.py
│   │   └── churn.py
│   ├── training/
│   │   ├── train_recommender.py
│   │   ├── train_sentiment.py
│   │   └── train_churn.py
│   ├── evaluation/
│   │   └── metrics.py
│   └── data/
│       └── generate_reviews.py
└── tests/
```
