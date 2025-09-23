"""
Locust load test for the SearchFlow ML API.

Tests the /recommend, /sentiment, and /churn endpoints
under configurable concurrent user load.

Usage:
    # With UI
    locust -f benchmarks/locustfile.py --host http://localhost:8000

    # Headless (100 users, 10/sec spawn, 60s duration)
    locust -f benchmarks/locustfile.py --host http://localhost:8000 \
        --headless -u 100 -r 10 -t 60s --csv benchmarks/results/report
"""

import random
from locust import HttpUser, task, between, tag


# Sample data for requests
SAMPLE_USER_IDS = [f"user_{i}" for i in range(500)]
SAMPLE_REVIEWS = [
    "Amazing hotel in Miami! Best vacation ever!",
    "Terrible service, would not recommend this hotel at all.",
    "The trip was okay, nothing special about it.",
    "Best travel experience ever! Cancun exceeded all my expectations.",
    "Worst flight I have ever taken. Delayed, dirty seats.",
    "Standard trip to Toronto. Not bad, not great.",
    "Absolutely perfect trip to Hawaii. Already planning my return!",
    "Do not book this hotel! Nothing like the photos.",
    "Mixed feelings about Barcelona. Some things were good.",
    "Loved every moment in Tokyo. The food was incredible!",
]


class MLApiUser(HttpUser):
    """Simulates a user making ML API requests."""

    wait_time = between(0.1, 0.5)

    @tag("recommend")
    @task(3)
    def get_recommendations(self) -> None:
        """Request personalized recommendations for a random user."""
        user_id = random.choice(SAMPLE_USER_IDS)
        top_n = random.choice([5, 10, 20])
        self.client.post(
            f"/recommend/{user_id}",
            json={"top_n": top_n},
            name="/recommend/[user_id]",
        )

    @tag("sentiment")
    @task(3)
    def analyze_sentiment(self) -> None:
        """Analyze sentiment of a single review."""
        text = random.choice(SAMPLE_REVIEWS)
        self.client.post(
            "/sentiment",
            json={"text": text},
        )

    @tag("sentiment_batch")
    @task(1)
    def analyze_sentiment_batch(self) -> None:
        """Analyze sentiment of a batch of reviews."""
        n = random.randint(2, 5)
        texts = random.sample(SAMPLE_REVIEWS, min(n, len(SAMPLE_REVIEWS)))
        self.client.post(
            "/sentiment/batch",
            json={"texts": texts},
        )

    @tag("churn")
    @task(2)
    def predict_churn(self) -> None:
        """Predict churn probability for a random user."""
        user_id = random.choice(SAMPLE_USER_IDS)
        self.client.post(
            f"/churn/{user_id}",
            json={},
            name="/churn/[user_id]",
        )

    @tag("health")
    @task(1)
    def health_check(self) -> None:
        """Hit the health endpoint."""
        self.client.get("/health")
