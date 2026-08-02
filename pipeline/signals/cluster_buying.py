"""Company-level independent insider purchase clusters."""

from __future__ import annotations

from datetime import timedelta

import pandas as pd


_OPERATING_ROLE_PATTERN = r"operating_executive|ceo|cfo|founder"


def cluster_for_event(
    event: dict,
    events: pd.DataFrame,
    window_days: int = 14,
) -> dict:
    """Measure distinct insider participation ending on the current event date."""
    if window_days <= 0:
        raise ValueError("window_days must be positive.")

    required = {
        "issuer_cik",
        "insider_id",
        "transaction_date",
        "purchase_value",
        "normalized_roles",
    }
    missing = sorted(required - set(events.columns))
    if missing:
        raise ValueError(f"Purchase events are missing required columns: {missing}")

    current_date = pd.Timestamp(event["transaction_date"])
    window_start = current_date - timedelta(days=window_days)

    transaction_dates = pd.to_datetime(
        events["transaction_date"],
        errors="coerce",
    )
    mask = (
        events["issuer_cik"].astype(str).eq(str(event["issuer_cik"]))
        & transaction_dates.ge(window_start)
        & transaction_dates.le(current_date)
    )
    cluster_events = events.loc[mask].copy()

    if cluster_events.empty:
        return {
            "cluster_window_days": window_days,
            "unique_buyers": 0,
            "unique_operating_executives": 0,
            "ceo_present": False,
            "cfo_present": False,
            "founder_present": False,
            "director_only_cluster": False,
            "cluster_purchase_value": 0.0,
            "cluster_score": 0.0,
            "cluster_quality": "limited",
        }

    buyers = cluster_events.drop_duplicates("insider_id", keep="last")
    role_text = buyers["normalized_roles"].fillna("").astype(str)

    ceo_present = role_text.str.contains(r"(?:^|\|)ceo(?:\||$)", regex=True).any()
    cfo_present = role_text.str.contains(r"(?:^|\|)cfo(?:\||$)", regex=True).any()
    founder_present = role_text.str.contains(
        r"(?:^|\|)founder(?:\||$)",
        regex=True,
    ).any()
    operating_mask = role_text.str.contains(
        _OPERATING_ROLE_PATTERN,
        regex=True,
    )

    unique_buyers = int(len(buyers))
    unique_operating_executives = int(operating_mask.sum())
    score = min(
        100.0,
        25.0 * unique_buyers
        + 15.0 * int(ceo_present)
        + 15.0 * int(cfo_present)
        + 15.0 * int(founder_present),
    )

    return {
        "cluster_window_days": window_days,
        "unique_buyers": unique_buyers,
        "unique_operating_executives": unique_operating_executives,
        "ceo_present": bool(ceo_present),
        "cfo_present": bool(cfo_present),
        "founder_present": bool(founder_present),
        "director_only_cluster": (
            unique_buyers > 1 and unique_operating_executives == 0
        ),
        "cluster_purchase_value": float(
            pd.to_numeric(
                cluster_events["purchase_value"],
                errors="coerce",
            ).fillna(0.0).sum()
        ),
        "cluster_score": score,
        "cluster_quality": "high" if unique_buyers > 1 else "acceptable",
    }
