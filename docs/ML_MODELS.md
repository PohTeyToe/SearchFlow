# ML Model Documentation

## Overview

SearchFlow includes three production-ready ML models served through a FastAPI endpoint at `http://localhost:8000`. Each model is trained on warehouse data and served with Redis caching.

---

## 1. Recommendation Engine

### Algorithm

Hybrid approach combining collaborative filtering and content-based filtering:

- **Collaborative filtering**: User-item interaction matrix built from search and click events. Uses truncated SVD for matrix factorization.
- **Content-based filtering**: TF-IDF vectors of search queries and destination metadata with cosine similarity.
- **Hybrid blending**: Final score is a weighted average (0.6 CF + 0.4 CB) with popularity bias correction for cold-start users.

### Features

| Feature | Source | Description |
|-|-|-|
| User-item interactions | `fct_search_funnel` | Binary matrix of user-destination interactions |
| Query embeddings | `stg_search_events` | TF-IDF vectors of search queries |
| Destination popularity | `fct_search_funnel` | Click and conversion counts per destination |
| Recency weight | `stg_search_events` | Exponential decay on older interactions |

### Evaluation

| Metric | Value |
|-|-|
| Precision@10 | 0.89 |
| NDCG@10 | 0.85 |
| Coverage | 0.72 |

### Serving

- Endpoint: `POST /recommend/{user_id}`
- Cache key: `reco:{user_id}:{top_n}`
- Cache TTL: 3600 seconds (configurable via `CACHE_TTL`)
- Cold-start fallback: Returns most popular destinations

---

## 2. Sentiment Analyzer

### Algorithm

Two-tier architecture:

1. **Primary (DistilBERT)**: Fine-tuned `distilbert-base-uncased` on travel review data. Classifies text into positive, negative, or neutral.
2. **Fallback (TF-IDF + Logistic Regression)**: Lightweight alternative for batch processing or when PyTorch is unavailable.

### Evaluation

| Metric | TF-IDF | DistilBERT |
|-|-|-|
| Accuracy | 0.88 | 0.92 |
| F1 (macro) | 0.86 | 0.90 |
| Inference latency (p50) | 2 ms | 15 ms |

### Serving

- Single: `POST /sentiment`
- Batch: `POST /sentiment/batch` (up to 100 texts)
- No caching (text inputs are too variable for useful cache hits)

---

## 3. Churn Predictor

### Algorithm

XGBoost gradient-boosted classifier with SHAP explanations. Predicts the probability that a user will not return within 30 days.

### Features (14 total)

| Feature | Description |
|-|-|
| `lead_time` | Days between booking and arrival |
| `total_stay_nights` | Weekend + weekday nights combined |
| `adr` | Average daily rate in euros |
| `is_repeated_guest` | 1 if returning customer |
| `previous_cancellations` | Prior cancellation count |
| `previous_bookings_not_canceled` | Prior completed bookings |
| `booking_changes` | Number of booking modifications |
| `total_of_special_requests` | Special requests count |
| `days_in_waiting_list` | Days on waitlist |
| `guests_total` | Adults + children + babies |
| `deposit_type_encoded` | Deposit category (0=none, 1=non-refund, 2=refundable) |
| `market_segment_encoded` | Booking channel encoded |
| `customer_type_encoded` | Customer type encoded |
| `weekend_stay_ratio` | Fraction of stay on weekends |

### Evaluation

| Metric | Value |
|-|-|
| AUC-ROC | 0.87 |
| Accuracy | 0.82 |
| Precision | 0.85 |
| Recall | 0.78 |
| F1 | 0.82 |

### SHAP Explanations

Every prediction includes the top contributing features via SHAP. The `top_factors` array shows which features increased or decreased churn risk, enabling targeted interventions.

### Risk Levels

| Level | Probability Range | Recommended Action |
|-|-|-|
| Low | < 0.30 | No action needed |
| Medium | 0.30 - 0.70 | Monitor, light engagement |
| High | > 0.70 | Immediate intervention (email, discount) |

---

## Model Artifacts

```
ml_engine/models/
    recommendation/
        user_factors.npy
        item_factors.npy
        tfidf_vectorizer.pkl
        metadata.json
    sentiment/
        model.pkl
        vectorizer.pkl
        label_encoder.pkl
        metadata.json
    churn/
        model.xgb
        feature_names.json
        metadata.json
```

Training results are saved to `ml_engine/training_results/` and exposed via the `/model-metrics` endpoint.

---

## Retraining

Models should be retrained when new data accumulates (weekly for recommendations and churn, monthly for sentiment) or when performance metrics degrade. Retraining is manual; exec into the ML engine container and run training scripts.

---

## 4. Drift Monitoring

Evidently AI detects feature distribution drift between reference and current data. The monitoring DAG runs daily:

1. Splits hotel booking data into reference (80%) and current (20%) windows
2. Runs `DataDriftPreset` report on 14 features
3. Saves HTML report and JSON results
4. Logs drift metrics to MLflow
5. Triggers retraining if drift_score > 0.3

The `/monitor/drift` API endpoint exposes the latest drift check results. Four simulation scenarios test the detection framework: pandemic, seasonal, geographic, and price inflation shifts.

## 5. MLflow Integration

All training runs are tracked in MLflow at http://localhost:5000:

- Experiment: `churn-prediction`, `sentiment-analysis`, `recommendation-engine`
- Logged: hyperparameters, evaluation metrics, SHAP plots, model artifacts
- The CI model-eval gate requires AUC-ROC >= 0.83
