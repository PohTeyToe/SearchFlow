# ML API Reference

## Base URL

```
http://localhost:8000
```

The ML Engine serves predictions over a FastAPI application. Responses are JSON. Redis caching reduces latency for repeated requests.

---

## Authentication

No authentication is required for local development. In production, add an API key header via a reverse proxy or FastAPI middleware.

---

## Endpoints

### Health Check

```
GET /health
```

Returns the service status and which models are loaded.

**Response** (`200 OK`):

```json
{
  "status": "healthy",
  "models_loaded": {
    "recommender": true,
    "sentiment": true,
    "churn": true
  },
  "version": "1.0.0"
}
```

---

### Recommendations

```
POST /recommend/{user_id}
```

Returns personalized destination recommendations for a user. Uses hybrid collaborative filtering combined with content-based features. Results are cached in Redis for 1 hour.

**Path parameters**:

| Parameter | Type | Description |
|-|-|-|
| `user_id` | string | User identifier (e.g., `user_42`) |

**Request body** (optional):

```json
{
  "top_n": 10
}
```

| Field | Type | Default | Constraints | Description |
|-|-|-|-|-|
| `top_n` | integer | 10 | 1-50 | Number of recommendations to return |

**Response** (`200 OK`):

```json
{
  "user_id": "user_42",
  "recommendations": [
    {
      "item_id": "dest_0",
      "destination": "Miami",
      "score": 0.95
    },
    {
      "item_id": "dest_1",
      "destination": "Cancun",
      "score": 0.88
    }
  ],
  "algorithm": "hybrid",
  "cached": false
}
```

**Example**:

```bash
curl -X POST http://localhost:8000/recommend/user_42 \
  -H "Content-Type: application/json" \
  -d '{"top_n": 5}'
```

---

### Sentiment Analysis

```
POST /sentiment
```

Classifies the sentiment of a single review text. Uses fine-tuned DistilBERT when available, falling back to TF-IDF with logistic regression.

**Request body**:

```json
{
  "text": "Amazing hotel in Miami! Best vacation ever!"
}
```

| Field | Type | Constraints | Description |
|-|-|-|-|
| `text` | string | 1-5000 chars | Review text to classify |

**Response** (`200 OK`):

```json
{
  "text": "Amazing hotel in Miami! Best vacation ever!",
  "sentiment": "positive",
  "confidence": 0.92,
  "probabilities": {
    "positive": 0.92,
    "negative": 0.04,
    "neutral": 0.04
  }
}
```

Sentiment labels: `positive`, `negative`, `neutral`.

**Example**:

```bash
curl -X POST http://localhost:8000/sentiment \
  -H "Content-Type: application/json" \
  -d '{"text": "Terrible flight, would not recommend."}'
```

---

### Batch Sentiment Analysis

```
POST /sentiment/batch
```

Classifies sentiment for multiple texts in a single request.

**Request body**:

```json
{
  "texts": [
    "Loved the resort in Cancun!",
    "Worst customer service I have ever experienced.",
    "The trip was fine, nothing special."
  ]
}
```

| Field | Type | Constraints | Description |
|-|-|-|-|
| `texts` | array of strings | Max 100 items | Review texts to classify |

**Response** (`200 OK`):

```json
{
  "results": [
    {
      "text": "Loved the resort in Cancun!",
      "sentiment": "positive",
      "confidence": 0.94,
      "probabilities": {"positive": 0.94, "negative": 0.02, "neutral": 0.04}
    },
    {
      "text": "Worst customer service I have ever experienced.",
      "sentiment": "negative",
      "confidence": 0.91,
      "probabilities": {"positive": 0.03, "negative": 0.91, "neutral": 0.06}
    },
    {
      "text": "The trip was fine, nothing special.",
      "sentiment": "neutral",
      "confidence": 0.78,
      "probabilities": {"positive": 0.12, "negative": 0.10, "neutral": 0.78}
    }
  ],
  "count": 3
}
```

---

### Churn Prediction

```
POST /churn/{user_id}
```

Predicts the probability that a user will churn, with SHAP-based explanations of the top risk factors. Uses an XGBoost classifier trained on 14 behavioral features.

**Path parameters**:

| Parameter | Type | Description |
|-|-|-|
| `user_id` | string | User identifier |

**Request body** (optional):

```json
{
  "features": {
    "sessions_7d": 0,
    "sessions_30d": 2,
    "sessions_90d": 15,
    "searches_total": 30,
    "clicks_total": 12,
    "conversions_total": 1,
    "search_to_click_ratio": 0.40,
    "click_to_conversion_ratio": 0.08,
    "avg_session_duration_mins": 8.5,
    "days_since_last_activity": 45,
    "lifetime_value": 450.00,
    "unique_destinations_searched": 4,
    "mobile_session_ratio": 0.60,
    "weekend_session_ratio": 0.30
  }
}
```

When `features` is omitted, the service fetches user features from the warehouse.

**Response** (`200 OK`):

```json
{
  "user_id": "user_42",
  "churn_probability": 0.72,
  "risk_level": "high",
  "top_factors": [
    {
      "feature": "days_since_last_activity",
      "impact": 0.25,
      "direction": "increases",
      "value": 45
    },
    {
      "feature": "sessions_7d",
      "impact": -0.18,
      "direction": "decreases",
      "value": 0
    },
    {
      "feature": "conversions_total",
      "impact": -0.10,
      "direction": "decreases",
      "value": 1
    }
  ],
  "cached": false
}
```

Risk levels: `low` (< 0.3), `medium` (0.3-0.7), `high` (> 0.7).

**Example**:

```bash
curl -X POST http://localhost:8000/churn/user_42 \
  -H "Content-Type: application/json" \
  -d '{}'
```

---

### Performance Metrics

```
GET /metrics
```

Returns model performance metrics loaded from the `training_results/` directory.

**Response** (`200 OK`):

```json
{
  "recommendation": {
    "algorithm": "hybrid_cf_cb",
    "precision_at_10": 0.89,
    "ndcg_at_10": 0.85
  },
  "sentiment": {
    "model": "tfidf_logreg",
    "accuracy": 0.92,
    "f1_macro": 0.90
  },
  "churn": {
    "model": "xgboost",
    "auc_roc": 0.85,
    "precision": 0.81,
    "recall": 0.78
  },
  "inference": {
    "cache_ttl_seconds": 3600
  }
}
```

---

## Error Responses

All endpoints return standard HTTP error codes:

| Code | Description |
|-|-|
| `400` | Invalid request body (validation error) |
| `404` | User not found |
| `422` | Unprocessable entity (Pydantic validation) |
| `500` | Internal server error |

Error body format:

```json
{
  "error": {
    "code": 500,
    "message": "An unexpected error occurred. Use the request_id to trace logs.",
    "path": "/churn/user_42",
    "request_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
  }
}
```

The `request_id` is unique per error and can be used to search server logs for debugging.

---

## Caching Behavior

Recommendations and churn predictions are cached in Redis:

- **Key format**: `reco:{user_id}:{top_n}` or `churn:{user_id}`
- **TTL**: Configurable via `CACHE_TTL` environment variable (default 3600 seconds)
- **Cache hit**: Response includes `"cached": true`
- **Invalidation**: Cache entries expire automatically; no manual invalidation endpoint

When Redis is unavailable, the API continues to serve predictions without caching.

---

## Load Testing

Use the Locust benchmark suite to stress-test the API:

```bash
# With browser UI
locust -f benchmarks/locustfile.py --host http://localhost:8000

# Headless run: 100 users, 10/sec spawn rate, 60 second duration
locust -f benchmarks/locustfile.py --host http://localhost:8000 \
  --headless -u 100 -r 10 -t 60s --csv benchmarks/results/report
```

Task weights in the benchmark:
- Recommendations: weight 3 (most common)
- Sentiment (single): weight 3
- Sentiment (batch): weight 1
- Churn prediction: weight 2
- Health check: weight 1
