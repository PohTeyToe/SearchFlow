"""
FastAPI application for ML inference.

Provides real-time predictions for recommendations, sentiment, and churn.
Supports Redis caching for low-latency responses.
"""

import hashlib
import os
import sys
import json
import time
import logging
from pathlib import Path
from typing import Optional
from contextlib import asynccontextmanager
from uuid import uuid4

from fastapi import FastAPI, HTTPException, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import redis
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address

try:
    from prometheus_fastapi_instrumentator import Instrumentator
    _HAS_PROMETHEUS = True
except ImportError:
    _HAS_PROMETHEUS = False

# Add parent to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from api.schemas import (
    RecommendationRequest, RecommendationResponse, RecommendationItem,
    SentimentRequest, SentimentResponse, BatchSentimentRequest, BatchSentimentResponse,
    ChurnRequest, ChurnResponse, ChurnFactor, RiskLevel,
    HealthResponse, SentimentLabel, ErrorDetail, ErrorResponse,
)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ============================================
# Configuration
# ============================================

MODEL_PATH = os.getenv("MODEL_PATH", "./models")
REDIS_HOST = os.getenv("REDIS_HOST", "localhost")
REDIS_PORT = int(os.getenv("REDIS_PORT", "6379"))
CACHE_TTL = int(os.getenv("CACHE_TTL", "3600"))  # 1 hour
ML_API_KEY = os.getenv("ML_API_KEY", "")

ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://localhost:5173",
]

# Include Vercel deployment URL if configured
_vercel_url = os.getenv("DASHBOARD_URL", "")
if _vercel_url:
    ALLOWED_ORIGINS.append(_vercel_url.rstrip("/"))

# Paths that bypass API key authentication
PUBLIC_PATHS = {"/health", "/docs", "/openapi.json", "/redoc"}

# ============================================
# Global State
# ============================================

models = {
    "recommender": None,
    "sentiment": None,
    "churn": None
}

redis_client: Optional[redis.Redis] = None


# ============================================
# Lifespan Handler
# ============================================

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Load models on startup, cleanup on shutdown."""
    global redis_client
    
    logger.info("Starting ML Engine...")
    
    # Connect to Redis
    try:
        redis_client = redis.Redis(host=REDIS_HOST, port=REDIS_PORT, decode_responses=True)
        redis_client.ping()
        logger.info(f"Redis connected ({REDIS_HOST}:{REDIS_PORT})")
    except Exception as e:
        logger.warning(f"Redis not available: {e}")
        redis_client = None
    
    # Load models
    load_models()
    
    logger.info("ML Engine ready")
    
    yield
    
    # Cleanup
    logger.info("Shutting down ML Engine...")
    if redis_client:
        redis_client.close()


def load_models():
    """Load trained models from disk."""
    global models
    
    # Load recommender
    recommender_path = os.path.join(MODEL_PATH, "recommendation")
    if os.path.exists(recommender_path):
        try:
            from src.models.recommendation import HybridRecommender
            models["recommender"] = HybridRecommender.load(recommender_path)
            logger.info("Recommender model loaded")
        except Exception as e:
            logger.warning(f"Recommender not loaded: {e}")
    
    # Load sentiment analyzer
    sentiment_path = os.path.join(MODEL_PATH, "sentiment")
    if os.path.exists(sentiment_path):
        try:
            from src.models.sentiment import SentimentAnalyzer
            models["sentiment"] = SentimentAnalyzer.load(sentiment_path)
            logger.info("Sentiment model loaded")
        except Exception as e:
            logger.warning(f"Sentiment not loaded: {e}")
    
    # Load churn predictor
    churn_path = os.path.join(MODEL_PATH, "churn")
    if os.path.exists(churn_path):
        try:
            from src.models.churn import ChurnPredictor
            models["churn"] = ChurnPredictor.load(churn_path)
            logger.info("Churn model loaded")
        except Exception as e:
            logger.warning(f"Churn not loaded: {e}")


# ============================================
# FastAPI App
# ============================================

app = FastAPI(
    title="SearchFlow ML Engine",
    description="Real-time ML inference for recommendations, sentiment, and churn prediction",
    version="1.0.0",
    lifespan=lifespan
)

# Rate limiting -- 100 requests/minute per IP on prediction endpoints
limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Prometheus metrics -- auto-instruments request count, latency, error rate
if _HAS_PROMETHEUS:
    Instrumentator(
        should_group_status_codes=True,
        excluded_handlers=["/health", "/docs", "/openapi.json", "/redoc"],
    ).instrument(app).expose(app, endpoint="/metrics/prometheus", include_in_schema=False)

# CORS -- restricted to known dashboard origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type", "X-API-Key", "Authorization"],
)


# ============================================
# API Key Authentication Middleware
# ============================================

@app.middleware("http")
async def api_key_middleware(request: Request, call_next):
    """Require a valid API key for non-public endpoints.

    The expected key is read from the ML_API_KEY env var.  When the var
    is empty (local dev), authentication is disabled so that the API
    remains usable without extra setup.
    """
    if not ML_API_KEY:
        # Auth disabled -- no key configured
        return await call_next(request)

    if request.url.path in PUBLIC_PATHS:
        return await call_next(request)

    provided_key = request.headers.get("X-API-Key", "")
    if provided_key != ML_API_KEY:
        return JSONResponse(
            status_code=401,
            content={
                "error": {
                    "code": 401,
                    "message": "Invalid or missing API key. Set the X-API-Key header.",
                    "path": str(request.url.path),
                    "request_id": str(uuid4()),
                }
            },
        )

    return await call_next(request)


# ============================================
# Error Handlers
# ============================================

@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    """Return standardized error responses with request ID for tracing."""
    request_id = str(uuid4())
    logger.warning(
        "HTTP %s on %s [request_id=%s]: %s",
        exc.status_code, request.url.path, request_id, exc.detail,
    )
    error = ErrorDetail(
        code=exc.status_code,
        message=exc.detail,
        path=str(request.url.path),
        request_id=request_id,
    )
    return JSONResponse(
        status_code=exc.status_code,
        content=ErrorResponse(error=error).model_dump(),
    )


@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    """Catch unhandled exceptions and return a structured 500 response."""
    request_id = str(uuid4())
    logger.error(
        "Unhandled error on %s [request_id=%s]: %s",
        request.url.path, request_id, exc, exc_info=True,
    )
    error = ErrorDetail(
        code=500,
        message="An unexpected error occurred. Use the request_id to trace logs.",
        path=str(request.url.path),
        request_id=request_id,
    )
    return JSONResponse(
        status_code=500,
        content=ErrorResponse(error=error).model_dump(),
    )


# ============================================
# Cache Helpers
# ============================================

def get_cached(key: str) -> Optional[dict]:
    """Get cached result from Redis.

    Returns None when Redis is unavailable or the key does not exist,
    allowing the caller to fall through to model inference.
    """
    if not redis_client:
        return None
    try:
        data = redis_client.get(key)
        return json.loads(data) if data else None
    except (redis.ConnectionError, redis.TimeoutError) as exc:
        logger.debug("Cache read failed for %s: %s", key, exc)
        return None
    except (json.JSONDecodeError, TypeError) as exc:
        logger.warning("Corrupt cache entry for %s: %s", key, exc)
        return None


def set_cached(key: str, value: dict, ttl: int = CACHE_TTL) -> None:
    """Cache result in Redis.

    Failures are logged but do not propagate -- the API continues
    to serve predictions without caching when Redis is down.
    """
    if not redis_client:
        return
    try:
        redis_client.setex(key, ttl, json.dumps(value))
    except (redis.ConnectionError, redis.TimeoutError) as exc:
        logger.debug("Cache write failed for %s: %s", key, exc)
    except TypeError as exc:
        logger.warning("Could not serialize value for %s: %s", key, exc)


# ============================================
# Endpoints
# ============================================

@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint."""
    return HealthResponse(
        status="healthy",
        models_loaded={
            "recommender": models["recommender"] is not None,
            "sentiment": models["sentiment"] is not None,
            "churn": models["churn"] is not None,
        },
        version="1.0.0"
    )


@app.post("/recommend/{user_id}", response_model=RecommendationResponse)
@limiter.limit("100/minute")
async def get_recommendations(
    request: Request,
    user_id: str,
    body: RecommendationRequest = RecommendationRequest()
):
    """
    Get personalized recommendations for a user.
    
    Uses hybrid collaborative + content-based filtering.
    Results are cached in Redis for 1 hour.
    """
    # Check cache
    cache_key = f"reco:{user_id}:{body.top_n}"
    cached = get_cached(cache_key)
    if cached:
        return RecommendationResponse(**cached, cached=True)

    # Check model
    if models["recommender"] is None:
        # Return mock data if model not loaded
        mock_recs = [
            RecommendationItem(item_id=f"dest_{i}", destination=d, score=0.9-i*0.05)
            for i, d in enumerate(["Miami", "Cancun", "Las Vegas", "Toronto", "NYC"][:body.top_n])
        ]
        return RecommendationResponse(
            user_id=user_id,
            recommendations=mock_recs,
            algorithm="mock",
            cached=False
        )

    # Get predictions
    result = models["recommender"].predict(user_id, top_n=body.top_n)
    
    recommendations = [
        RecommendationItem(
            item_id=rec["item_id"],
            destination=rec["destination"],
            score=rec["score"]
        )
        for rec in result.recommendations
    ]
    
    response = RecommendationResponse(
        user_id=user_id,
        recommendations=recommendations,
        algorithm=result.algorithm,
        cached=False
    )
    
    # Cache result
    set_cached(cache_key, response.model_dump())
    
    return response


@app.post("/sentiment", response_model=SentimentResponse)
@limiter.limit("100/minute")
async def analyze_sentiment(request: Request, body: SentimentRequest):
    """
    Classify sentiment of review text.

    Uses fine-tuned DistilBERT or TF-IDF fallback.
    """
    if models["sentiment"] is None:
        # Mock response
        return SentimentResponse(
            text=body.text,
            sentiment=SentimentLabel.positive,
            confidence=0.92,
            probabilities={"positive": 0.92, "negative": 0.04, "neutral": 0.04}
        )

    result = models["sentiment"].predict(body.text)

    return SentimentResponse(
        text=result.text,
        sentiment=SentimentLabel(result.sentiment),
        confidence=result.confidence,
        probabilities=result.probabilities
    )


@app.post("/sentiment/batch", response_model=BatchSentimentResponse)
@limiter.limit("100/minute")
async def analyze_sentiment_batch(request: Request, body: BatchSentimentRequest):
    """Batch sentiment analysis for multiple texts."""
    results = []

    for text in body.texts:
        if models["sentiment"] is None:
            results.append(SentimentResponse(
                text=text,
                sentiment=SentimentLabel.positive,
                confidence=0.92,
                probabilities={"positive": 0.92, "negative": 0.04, "neutral": 0.04}
            ))
        else:
            result = models["sentiment"].predict(text)
            results.append(SentimentResponse(
                text=result.text,
                sentiment=SentimentLabel(result.sentiment),
                confidence=result.confidence,
                probabilities=result.probabilities
            ))

    return BatchSentimentResponse(results=results, count=len(results))


@app.post("/churn/{user_id}", response_model=ChurnResponse)
@limiter.limit("100/minute")
async def predict_churn(request: Request, user_id: str, body: ChurnRequest = ChurnRequest()):
    """
    Predict churn probability with SHAP explanations.
    
    Uses XGBoost model with SHAP explanations.
    Returns top risk factors for intervention.
    """
    # Check cache
    cache_key = f"churn:{user_id}"
    cached = get_cached(cache_key)
    if cached and body.features is None:
        return ChurnResponse(**cached, cached=True)
    
    if models["churn"] is None:
        # Mock response
        return ChurnResponse(
            user_id=user_id,
            churn_probability=0.45,
            risk_level=RiskLevel.medium,
            top_factors=[
                ChurnFactor(feature="lead_time", impact=0.15, direction="increases", value=120),
                ChurnFactor(feature="deposit_type_encoded", impact=0.12, direction="increases", value=1),
                ChurnFactor(feature="adr", impact=-0.08, direction="decreases", value=85.0),
            ],
            cached=False
        )
    
    # Get user features (from body or fetch from warehouse)
    features = body.features or get_user_features(user_id)
    
    result = models["churn"].predict(user_id, features)
    
    response = ChurnResponse(
        user_id=user_id,
        churn_probability=result.churn_probability,
        risk_level=RiskLevel(result.risk_level),
        top_factors=[
            ChurnFactor(**factor) for factor in result.top_factors
        ],
        cached=False
    )
    
    # Cache result
    set_cached(cache_key, response.model_dump())
    
    return response


def _deterministic_float(seed: int, lo: float, hi: float) -> float:
    """Return a deterministic float in [lo, hi] derived from *seed*."""
    return lo + (seed % 10000) / 10000 * (hi - lo)


def _deterministic_int(seed: int, lo: int, hi: int) -> int:
    """Return a deterministic int in [lo, hi] derived from *seed*."""
    return lo + seed % (hi - lo + 1)


def get_user_features(user_id: str) -> dict:
    """Build a deterministic feature vector from a user ID.

    In production this would query the DuckDB warehouse / mart_ml_features.
    For now we derive every value from a hash of the user_id so that:
      - The same user_id always returns the same features (no randomness).
      - Different user_ids produce different but plausible feature values.
    """
    digest = hashlib.sha256(user_id.encode()).hexdigest()
    seeds = [int(digest[i : i + 8], 16) for i in range(0, 64, 8)]

    return {
        "lead_time": _deterministic_int(seeds[0], 0, 400),
        "total_stay_nights": _deterministic_int(seeds[0] >> 4, 1, 14),
        "adr": round(_deterministic_float(seeds[1], 30.0, 300.0), 2),
        "is_repeated_guest": _deterministic_int(seeds[1] >> 4, 0, 1),
        "previous_cancellations": _deterministic_int(seeds[2], 0, 5),
        "previous_bookings_not_canceled": _deterministic_int(seeds[2] >> 4, 0, 20),
        "booking_changes": _deterministic_int(seeds[3], 0, 5),
        "total_of_special_requests": _deterministic_int(seeds[3] >> 4, 0, 5),
        "days_in_waiting_list": _deterministic_int(seeds[4], 0, 50),
        "guests_total": _deterministic_int(seeds[4] >> 4, 1, 6),
        "deposit_type_encoded": _deterministic_int(seeds[5], 0, 2),
        "market_segment_encoded": _deterministic_int(seeds[5] >> 4, 0, 7),
        "customer_type_encoded": _deterministic_int(seeds[6], 0, 3),
        "weekend_stay_ratio": round(_deterministic_float(seeds[6] >> 4, 0.0, 1.0), 3),
    }


# ============================================
# Performance Metrics Endpoint
# ============================================

@app.get("/model-metrics")
async def get_model_metrics():
    """Get model performance metrics loaded from training results."""
    metrics = {
        "recommendation": {"algorithm": "hybrid_cf_cb"},
        "sentiment": {"model": "tfidf_logreg"},
        "churn": {"model": "xgboost"},
        "inference": {"cache_ttl_seconds": CACHE_TTL},
    }

    # Load saved training results if available
    results_dir = os.path.join(MODEL_PATH, "..", "training_results")
    for name, filename in [
        ("recommendation", "recommender_results.json"),
        ("sentiment", "sentiment_results.json"),
        ("churn", "churn_results.json"),
    ]:
        filepath = os.path.join(results_dir, filename)
        if os.path.exists(filepath):
            try:
                with open(filepath, "r") as f:
                    metrics[name] = json.load(f)
            except (json.JSONDecodeError, OSError) as exc:
                logger.warning("Failed to load %s metrics from %s: %s", name, filepath, exc)

    return metrics


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
