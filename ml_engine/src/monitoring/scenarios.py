"""Distribution shift simulation scenarios for drift testing.

Each scenario takes a raw hotel bookings DataFrame and returns a
modified copy with realistic distributional shifts. The output can
be run through engineer_features() for drift detection.
"""

import numpy as np
import pandas as pd


def pandemic_scenario(df: pd.DataFrame) -> pd.DataFrame:
    """Simulate pandemic travel collapse."""
    out = df.copy()
    n = len(out)
    np.random.seed(100)

    # Cancellation rate to ~90%
    out["is_canceled"] = np.random.choice([0, 1], n, p=[0.1, 0.9])

    # Lead time compressed to <14 days
    out["lead_time"] = np.minimum(
        np.random.exponential(7, n).astype(int), 30
    )

    # Country collapse to domestic (PRT 85%, ESP/FRA 15%)
    out["country"] = np.random.choice(
        ["PRT", "ESP", "FRA"], n, p=[0.85, 0.10, 0.05]
    )

    # ADR drops 40%
    out["adr"] = np.maximum(out["adr"] * 0.6, 10)

    # Special requests decrease
    mask = np.random.random(n) < 0.7
    out.loc[mask, "total_of_special_requests"] = 0

    # Waiting list drops
    out["days_in_waiting_list"] = 0

    return out


def seasonal_peak_scenario(df: pd.DataFrame) -> pd.DataFrame:
    """Simulate high-season summer tourism peak."""
    np.random.seed(101)

    # Filter to summer months
    summer = df[df["arrival_date_month"].isin(["June", "July", "August"])].copy()
    if len(summer) < 5000:
        summer = summer.sample(n=5000, replace=True, random_state=101).reset_index(drop=True)

    n = len(summer)

    # ADR increase +30%
    summer["adr"] = summer["adr"] * 1.3

    # More families
    no_kids = summer["children"].fillna(0) == 0
    flip_mask = no_kids & (np.random.random(n) < 0.4)
    summer.loc[flip_mask, "children"] = np.random.choice([1, 2], flip_mask.sum())

    # Booking changes increase
    summer["booking_changes"] = summer["booking_changes"] + np.random.poisson(2, n)

    # Weekend stays increase for 30%
    weekend_mask = np.random.random(n) < 0.3
    summer.loc[weekend_mask, "stays_in_weekend_nights"] += np.random.randint(1, 3, weekend_mask.sum())

    # Cancellation rate drops to ~20%
    summer["is_canceled"] = np.random.choice([0, 1], n, p=[0.8, 0.2])

    return summer


def geographic_shift_scenario(df: pd.DataFrame) -> pd.DataFrame:
    """Simulate expansion to Asian markets."""
    out = df.copy()
    n = len(out)
    np.random.seed(102)

    # Country redistribution — Asian-heavy
    asian = np.random.choice(
        ["CHN", "JPN", "KOR", "IND", "THA"],
        int(n * 0.7), p=[0.36, 0.21, 0.17, 0.14, 0.12],
    )
    euro = np.random.choice(
        ["PRT", "GBR", "FRA", "ESP", "DEU"],
        n - len(asian),
    )
    out["country"] = np.concatenate([asian, euro])
    np.random.shuffle(out["country"].values)

    # Market segment shift — more Online TA
    out["market_segment"] = np.random.choice(
        ["Online TA", "Groups", "Direct", "Corporate", "Offline TA/TO"],
        n, p=[0.60, 0.15, 0.10, 0.10, 0.05],
    )

    # Lead time increase for Asian travelers
    out["lead_time"] = out["lead_time"] + np.random.randint(30, 90, n)
    out["lead_time"] = np.minimum(out["lead_time"], 500)

    # More adults-only
    adult_mask = np.random.random(n) < 0.8
    out.loc[adult_mask, "children"] = 0
    out.loc[adult_mask, "babies"] = 0

    # Customer type shift
    out["customer_type"] = np.random.choice(
        ["Transient", "Transient-Party", "Contract", "Group"],
        n, p=[0.75, 0.15, 0.07, 0.03],
    )

    return out


def price_inflation_scenario(df: pd.DataFrame) -> pd.DataFrame:
    """Simulate inflationary period."""
    out = df.copy()
    n = len(out)
    np.random.seed(103)

    # ADR scaled up ~40%
    out["adr"] = out["adr"] * 1.4 + np.random.normal(0, 5, n)
    out["adr"] = np.maximum(out["adr"], 10)

    # Deposit type shift toward Non Refund
    deposit_mask = np.random.random(n) < 0.5
    out.loc[deposit_mask, "deposit_type"] = "Non Refund"

    # Waiting list increases
    out["days_in_waiting_list"] = np.random.exponential(15, n).astype(int)

    # Cancellation rate increases to ~50%
    out["is_canceled"] = np.random.choice([0, 1], n, p=[0.5, 0.5])

    # Previous cancellations increase
    out["previous_cancellations"] = out["previous_cancellations"] + np.random.poisson(1, n)

    # Booking changes increase
    out["booking_changes"] = out["booking_changes"] + np.random.poisson(1, n)

    return out


SCENARIOS = {
    "pandemic": pandemic_scenario,
    "seasonal_peak": seasonal_peak_scenario,
    "geographic_shift": geographic_shift_scenario,
    "price_inflation": price_inflation_scenario,
}
