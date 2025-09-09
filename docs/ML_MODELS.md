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
| `sessions_7d` | Sessions in the last 7 days |
| `sessions_30d` | Sessions in the last 30 days |
| `sessions_90d` | Sessions in the last 90 days |
| `searches_total` | Lifetime search count |
| `clicks_total` | Lifetime click count |
| `conversions_total` | Lifetime booking count |
| `search_to_click_ratio` | Clicks / searches |
| `click_to_conversion_ratio` | Conversions / clicks |
| `avg_session_duration_mins` | Mean session length |
| `days_since_last_activity` | Days since last event |
| `lifetime_value` | Total booking revenue |
| `unique_destinations_searched` | Destination diversity |
| `mobile_session_ratio` | Fraction of sessions on mobile |
| `weekend_session_ratio` | Fraction of sessions on weekends |

### Evaluation

| Metric | Value |
|-|-|
| AUC-ROC | 0.85 |
| Precision | 0.81 |
| Recall | 0.78 |
| F1 | 0.79 |

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

Training results are saved to `ml_engine/training_results/` and exposed via the `/metrics` endpoint.

---

## Retraining

Models should be retrained when new data accumulates (weekly for recommendations and churn, monthly for sentiment) or when performance metrics degrade. Retraining is manual; exec into the ML engine container and run training scripts.
