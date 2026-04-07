"""
Churn Prediction Model for SearchFlow.

XGBoost-based propensity model with SHAP explainability
for identifying at-risk hotel booking cancellations.

v2.0: Trained on real hotel booking demand data (Antonio et al., 2019).
Features derived from booking attributes rather than synthetic user sessions.
"""

import json
import os
from dataclasses import dataclass
from typing import Dict, List, Optional, Tuple

import joblib
import numpy as np
import pandas as pd
import shap
import xgboost as xgb
from sklearn.metrics import roc_auc_score
from sklearn.preprocessing import StandardScaler


@dataclass
class ChurnPrediction:
    """Result from churn prediction."""
    user_id: str
    churn_probability: float
    risk_level: str  # low, medium, high
    top_factors: List[Dict]  # SHAP explanations


@dataclass
class ChurnModelMetrics:
    """Model evaluation metrics."""
    auc: float
    accuracy: float
    precision: float
    recall: float
    f1: float


# ── Encoding maps (must match dbt mart_ml_features.sql) ─────────────

DEPOSIT_TYPE_MAP = {"No Deposit": 0, "Non Refund": 1, "Refundable": 2}

MARKET_SEGMENT_MAP = {
    "Aviation": 0,
    "Complementary": 1,
    "Corporate": 2,
    "Direct": 3,
    "Groups": 4,
    "Offline TA/TO": 5,
    "Online TA": 6,
    "Undefined": 7,
}

CUSTOMER_TYPE_MAP = {
    "Contract": 0,
    "Group": 1,
    "Transient": 2,
    "Transient-Party": 3,
}


def engineer_features(df: pd.DataFrame) -> pd.DataFrame:
    """Transform raw hotel bookings into model-ready features.

    This is the SINGLE SOURCE OF TRUTH for feature engineering.
    The dbt SQL model (mart_ml_features.sql) must produce identical output.
    """
    out = pd.DataFrame()
    out["lead_time"] = df["lead_time"].astype(int)
    out["total_stay_nights"] = (
        df["stays_in_weekend_nights"] + df["stays_in_week_nights"]
    ).astype(int)
    out["adr"] = df["adr"].astype(float)
    out["is_repeated_guest"] = df["is_repeated_guest"].astype(int)
    out["previous_cancellations"] = df["previous_cancellations"].astype(int)
    out["previous_bookings_not_canceled"] = df["previous_bookings_not_canceled"].astype(int)
    out["booking_changes"] = df["booking_changes"].astype(int)
    out["total_of_special_requests"] = df["total_of_special_requests"].astype(int)
    out["days_in_waiting_list"] = df["days_in_waiting_list"].astype(int)
    out["guests_total"] = (
        df["adults"] + df["children"].fillna(0) + df["babies"]
    ).astype(int)

    # Categorical encoding — fixed maps for reproducibility
    out["deposit_type_encoded"] = (
        df["deposit_type"].map(DEPOSIT_TYPE_MAP).fillna(0).astype(int)
    )
    out["market_segment_encoded"] = (
        df["market_segment"].map(MARKET_SEGMENT_MAP).fillna(0).astype(int)
    )
    out["customer_type_encoded"] = (
        df["customer_type"].map(CUSTOMER_TYPE_MAP).fillna(0).astype(int)
    )

    # Derived ratio — guard against zero-night stays
    total = out["total_stay_nights"]
    out["weekend_stay_ratio"] = (
        df["stays_in_weekend_nights"] / total.replace(0, 1)
    ).where(total > 0, 0.0)

    out["is_canceled"] = df["is_canceled"].astype(int)
    return out


class ChurnPredictor:
    """
    XGBoost-based churn prediction model with SHAP explainability.

    v2.0: Trained on hotel booking demand data. Predicts booking
    cancellation probability using 14 domain-specific features.
    """

    MODEL_VERSION = "2.0"

    FEATURE_NAMES = [
        "lead_time",
        "total_stay_nights",
        "adr",
        "is_repeated_guest",
        "previous_cancellations",
        "previous_bookings_not_canceled",
        "booking_changes",
        "total_of_special_requests",
        "days_in_waiting_list",
        "guests_total",
        "deposit_type_encoded",
        "market_segment_encoded",
        "customer_type_encoded",
        "weekend_stay_ratio",
    ]

    def __init__(
        self,
        n_estimators: int = 200,
        max_depth: int = 6,
        learning_rate: float = 0.1,
        random_state: int = 42,
    ):
        self.n_estimators = n_estimators
        self.max_depth = max_depth
        self.learning_rate = learning_rate
        self.random_state = random_state

        self.model = xgb.XGBClassifier(
            n_estimators=n_estimators,
            max_depth=max_depth,
            learning_rate=learning_rate,
            random_state=random_state,
            eval_metric="auc",
        )
        self.scaler = StandardScaler()
        self.explainer = None
        self.feature_names = self.FEATURE_NAMES.copy()
        self.is_fitted = False

    def fit(
        self,
        X: pd.DataFrame,
        y: pd.Series,
        eval_set: Optional[Tuple[pd.DataFrame, pd.Series]] = None,
    ) -> "ChurnPredictor":
        """Train the churn prediction model."""
        X_scaled = self.scaler.fit_transform(X)

        eval_data = None
        if eval_set:
            X_val, y_val = eval_set
            X_val_scaled = self.scaler.transform(X_val)
            eval_data = [(X_val_scaled, y_val)]

        self.model.fit(X_scaled, y, eval_set=eval_data, verbose=False)
        self.explainer = shap.TreeExplainer(self.model)
        self.is_fitted = True

        return self

    def predict_proba(self, X: pd.DataFrame) -> np.ndarray:
        X_scaled = self.scaler.transform(X)
        return self.model.predict_proba(X_scaled)[:, 1]

    def predict(self, user_id: str, features: Dict[str, float]) -> ChurnPrediction:
        """Predict churn probability for a user with SHAP explanations."""
        X = pd.DataFrame([features])[self.feature_names]
        X_scaled = self.scaler.transform(X)

        churn_prob = float(self.model.predict_proba(X_scaled)[0, 1])

        shap_values = self.explainer.shap_values(X_scaled)[0]
        factor_importance = list(zip(self.feature_names, shap_values))
        factor_importance.sort(key=lambda x: abs(x[1]), reverse=True)

        top_factors = [
            {
                "feature": name,
                "impact": float(value),
                "direction": "increases" if value > 0 else "decreases",
                "value": features.get(name, 0),
            }
            for name, value in factor_importance[:5]
        ]

        if churn_prob < 0.3:
            risk_level = "low"
        elif churn_prob < 0.7:
            risk_level = "medium"
        else:
            risk_level = "high"

        return ChurnPrediction(
            user_id=user_id,
            churn_probability=churn_prob,
            risk_level=risk_level,
            top_factors=top_factors,
        )

    def predict_batch(
        self, user_ids: List[str], features_df: pd.DataFrame
    ) -> List[ChurnPrediction]:
        predictions = []
        for user_id, (_, row) in zip(user_ids, features_df.iterrows()):
            predictions.append(self.predict(user_id, row.to_dict()))
        return predictions

    def evaluate(self, X: pd.DataFrame, y: pd.Series) -> ChurnModelMetrics:
        """Evaluate model performance."""
        X_scaled = self.scaler.transform(X)
        y_pred = self.model.predict(X_scaled)
        y_proba = self.model.predict_proba(X_scaled)[:, 1]

        from sklearn.metrics import accuracy_score, f1_score, precision_score, recall_score

        return ChurnModelMetrics(
            auc=roc_auc_score(y, y_proba),
            accuracy=accuracy_score(y, y_pred),
            precision=precision_score(y, y_pred),
            recall=recall_score(y, y_pred),
            f1=f1_score(y, y_pred),
        )

    def get_feature_importance(self) -> pd.DataFrame:
        importance = self.model.feature_importances_
        return pd.DataFrame(
            {"feature": self.feature_names, "importance": importance}
        ).sort_values("importance", ascending=False)

    def save(self, path: str):
        os.makedirs(path, exist_ok=True)
        self.model.save_model(os.path.join(path, "churn_model.json"))
        joblib.dump(self.scaler, os.path.join(path, "scaler.joblib"))
        config = {
            "model_version": self.MODEL_VERSION,
            "n_estimators": self.n_estimators,
            "max_depth": self.max_depth,
            "learning_rate": self.learning_rate,
            "feature_names": self.feature_names,
        }
        with open(os.path.join(path, "config.json"), "w") as f:
            json.dump(config, f)

    @classmethod
    def load(cls, path: str) -> "ChurnPredictor":
        with open(os.path.join(path, "config.json"), "r") as f:
            config = json.load(f)

        predictor = cls(
            n_estimators=config["n_estimators"],
            max_depth=config["max_depth"],
            learning_rate=config["learning_rate"],
        )
        predictor.feature_names = config["feature_names"]
        predictor.model.load_model(os.path.join(path, "churn_model.json"))
        predictor.scaler = joblib.load(os.path.join(path, "scaler.joblib"))
        predictor.explainer = shap.TreeExplainer(predictor.model)
        predictor.is_fitted = True

        return predictor
