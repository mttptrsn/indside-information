"""Precomputed company price-and-purchase stories for the static frontend."""

from __future__ import annotations

import math
from typing import Any

import numpy as np
import pandas as pd

from pipeline.export.schemas import WEB_SCHEMA_VERSION
from pipeline.export.utils import (
    compact_number,
    json_safe,
    numeric_series,
    records,
    text_series,
)


MAX_PRICE_POINTS = 260
MAX_PURCHASE_MARKERS = 250
MAX_HISTORY_SESSIONS = 756


def _empty_story(
    company: dict[str, Any],
    *,
    generated_at_utc: str,
    as_of_date: str,
    freshness: dict[str, Any],
    reason: str,
) -> dict[str, Any]:
    ticker = (
        company.get("primary_ticker")
        or company.get("ticker")
        or company.get("yf_ticker")
        or ""
    )
    return {
        "schema_version": WEB_SCHEMA_VERSION,
        "generated_at_utc": generated_at_utc,
        "as_of_date": as_of_date,
        "freshness": freshness,
        "ticker": ticker,
        "issuer_cik": company.get("issuer_cik"),
        "company_name": company.get("company_name")
        or company.get("issuer_name"),
        "price_available": False,
        "price_unavailable_reason": reason,
        "price_path": [],
        "purchase_markers": [],
        "summary": {
            "current_price": None,
            "average_reported_purchase_price": None,
            "percent_vs_average_purchase_price": None,
            "return_since_first_purchase": None,
            "return_since_latest_purchase": None,
            "drawdown_from_52_week_high": None,
            "drawdown_from_3_year_high": None,
            "distance_from_200_day_average": None,
            "realized_volatility_63d": None,
            "volatility_percentile": None,
            "trend": "unavailable",
            "buyers": 0,
            "purchase_days": 0,
            "purchase_events": 0,
            "total_reported_purchase_value": 0,
        },
        "limitations": [
            "No usable yfinance price history was available for this ticker.",
            "Reported transaction values remain available in the company dossier.",
        ],
    }


def _prepare_prices(prices: pd.DataFrame) -> pd.DataFrame:
    if prices.empty or "date" not in prices.columns:
        return pd.DataFrame()

    frame = prices.copy()
    frame["date"] = pd.to_datetime(
        frame["date"],
        format="mixed",
        errors="coerce",
        utc=True,
    )
    frame = frame.dropna(subset=["date"]).sort_values(
        "date",
        kind="mergesort",
    )
    frame = frame.drop_duplicates("date", keep="last")

    for column in [
        "open",
        "high",
        "low",
        "close",
        "adj_close",
        "volume",
        "dividends",
        "stock_splits",
    ]:
        if column not in frame.columns:
            frame[column] = np.nan
        frame[column] = pd.to_numeric(
            frame[column],
            errors="coerce",
        )

    frame["story_close"] = frame["adj_close"].where(
        frame["adj_close"].gt(0),
        frame["close"],
    )
    frame = frame[
        frame["story_close"].notna()
        & frame["story_close"].gt(0)
    ].copy()

    return frame.tail(MAX_HISTORY_SESSIONS).reset_index(drop=True)


def _prepare_events(
    events: pd.DataFrame,
    event_signals: pd.DataFrame,
) -> pd.DataFrame:
    if events.empty:
        return pd.DataFrame()

    frame = events.copy()
    frame["transaction_date"] = pd.to_datetime(
        frame.get("transaction_date", ""),
        format="mixed",
        errors="coerce",
        utc=True,
    )
    frame = frame.dropna(subset=["transaction_date"]).copy()

    if (
        not event_signals.empty
        and "event_id" in frame.columns
        and "event_id" in event_signals.columns
    ):
        signal_columns = [
            column
            for column in [
                "event_id",
                "conviction_score",
                "behavior_change_score",
                "abnormality_score",
                "silence_break_score",
                "cluster_score",
                "headline",
                "grade",
            ]
            if column in event_signals.columns
        ]
        signals = (
            event_signals[signal_columns]
            .sort_values(
                "event_id",
                kind="mergesort",
            )
            .drop_duplicates("event_id", keep="last")
        )
        frame = frame.merge(
            signals,
            on="event_id",
            how="left",
            suffixes=("", "_signal"),
        )

    return frame.sort_values(
        ["transaction_date", "event_id"]
        if "event_id" in frame.columns
        else ["transaction_date"],
        kind="mergesort",
    ).reset_index(drop=True)


def _nearest_price(
    prices: pd.DataFrame,
    timestamp: pd.Timestamp,
) -> tuple[pd.Timestamp | None, float | None]:
    if prices.empty:
        return None, None

    positions = prices["date"].searchsorted(timestamp)
    if positions >= len(prices):
        positions = len(prices) - 1

    row = prices.iloc[int(positions)]
    value = row.get("story_close")
    if pd.isna(value):
        return None, None

    return row["date"], float(value)


def _event_price(row: pd.Series) -> float | None:
    for column in [
        "weighted_average_price",
        "price_per_share",
        "reported_price",
        "average_purchase_price",
    ]:
        value = row.get(column)
        try:
            number = float(value)
        except (TypeError, ValueError):
            continue
        if math.isfinite(number) and number > 0:
            return number

    shares = row.get("purchase_shares", row.get("shares"))
    value = row.get(
        "purchase_value",
        row.get("total_reported_purchase_value"),
    )
    try:
        shares_number = float(shares)
        value_number = float(value)
    except (TypeError, ValueError):
        return None

    if (
        math.isfinite(shares_number)
        and shares_number > 0
        and math.isfinite(value_number)
        and value_number > 0
    ):
        return value_number / shares_number
    return None


def _weighted_average_purchase_price(events: pd.DataFrame) -> float | None:
    numerator = 0.0
    denominator = 0.0

    for _, row in events.iterrows():
        price = _event_price(row)
        if price is None:
            continue

        shares = row.get(
            "purchase_shares",
            row.get("shares", row.get("total_shares")),
        )
        try:
            weight = float(shares)
        except (TypeError, ValueError):
            weight = 0.0

        if not math.isfinite(weight) or weight <= 0:
            value = row.get(
                "purchase_value",
                row.get("total_reported_purchase_value"),
            )
            try:
                weight = float(value) / price
            except (TypeError, ValueError, ZeroDivisionError):
                weight = 0.0

        if math.isfinite(weight) and weight > 0:
            numerator += price * weight
            denominator += weight

    return numerator / denominator if denominator > 0 else None


def _downsample_prices(
    prices: pd.DataFrame,
    event_dates: set[str],
) -> pd.DataFrame:
    if len(prices) <= MAX_PRICE_POINTS:
        return prices.copy()

    step = max(1, math.ceil(len(prices) / MAX_PRICE_POINTS))
    positions = set(range(0, len(prices), step))
    positions.add(len(prices) - 1)

    if event_dates:
        normalized = prices["date"].dt.strftime("%Y-%m-%d")
        for event_date in sorted(event_dates):
            matches = np.flatnonzero(normalized.eq(event_date).to_numpy())
            if len(matches):
                positions.add(int(matches[0]))
                continue

            target = pd.Timestamp(event_date, tz="UTC")
            insertion = int(prices["date"].searchsorted(target))
            if insertion < len(prices):
                positions.add(insertion)
            if insertion > 0:
                positions.add(insertion - 1)

    return prices.iloc[sorted(positions)].reset_index(drop=True)


def _volatility_context(prices: pd.DataFrame) -> tuple[float | None, float | None]:
    returns = prices["story_close"].pct_change(fill_method=None)
    rolling = returns.rolling(63, min_periods=40).std() * np.sqrt(252)

    current = rolling.iloc[-1] if len(rolling) else np.nan
    valid = rolling.dropna()

    if pd.isna(current) or valid.empty:
        return None, None

    percentile = float((valid <= current).mean() * 100)
    return float(current), percentile


def _trend_label(
    current_price: float,
    moving_average_200: float | None,
    return_63d: float | None,
) -> str:
    if moving_average_200 is None or return_63d is None:
        return "insufficient_history"
    if current_price >= moving_average_200 and return_63d >= 0.05:
        return "advancing"
    if current_price >= moving_average_200 and return_63d > -0.05:
        return "holding_above_trend"
    if current_price < moving_average_200 and return_63d >= 0:
        return "recovering"
    if return_63d <= -0.15:
        return "falling"
    return "below_trend"


def build_company_story(
    company: dict[str, Any],
    prices: pd.DataFrame,
    events: pd.DataFrame,
    event_signals: pd.DataFrame,
    *,
    generated_at_utc: str,
    as_of_date: str,
    freshness: dict[str, Any],
) -> dict[str, Any]:
    """Build a compact, deterministic visual story for one company."""
    prepared_prices = _prepare_prices(prices)
    prepared_events = _prepare_events(events, event_signals)

    if prepared_prices.empty:
        return _empty_story(
            company,
            generated_at_utc=generated_at_utc,
            as_of_date=as_of_date,
            freshness=freshness,
            reason="missing_or_unusable_price_history",
        )

    event_dates = set(
        prepared_events["transaction_date"]
        .dt.strftime("%Y-%m-%d")
        .tolist()
        if not prepared_events.empty
        else []
    )
    sampled_prices = _downsample_prices(
        prepared_prices,
        event_dates,
    )

    price_path = [
        json_safe(
            {
                "date": row["date"].date().isoformat(),
                "close": row.get("close"),
                "adjusted_close": row.get("story_close"),
                "volume": row.get("volume"),
            }
        )
        for _, row in sampled_prices.iterrows()
    ]

    purchase_markers: list[dict[str, Any]] = []
    for _, event in prepared_events.tail(MAX_PURCHASE_MARKERS).iterrows():
        price_date, market_price = _nearest_price(
            prepared_prices,
            event["transaction_date"],
        )
        reported_price = _event_price(event)
        purchase_markers.append(
            json_safe(
                {
                    "event_id": event.get("event_id"),
                    "transaction_date": event[
                        "transaction_date"
                    ].date().isoformat(),
                    "price_date": (
                        price_date.date().isoformat()
                        if price_date is not None
                        else None
                    ),
                    "market_price": market_price,
                    "reported_purchase_price": reported_price,
                    "purchase_value": event.get(
                        "purchase_value",
                        event.get("total_reported_purchase_value"),
                    ),
                    "shares": event.get(
                        "purchase_shares",
                        event.get("shares", event.get("total_shares")),
                    ),
                    "owner_cik": event.get("owner_cik"),
                    "owner_name": event.get("owner_name"),
                    "roles": event.get("normalized_roles"),
                    "direct_indirect": event.get(
                        "direct_indirect",
                        event.get("direct_indirect_ownership"),
                    ),
                    "ownership_increase_percent": event.get(
                        "ownership_increase_percent"
                    ),
                    "conviction_score": event.get("conviction_score"),
                    "behavior_change_score": event.get(
                        "behavior_change_score"
                    ),
                    "headline": event.get("headline"),
                }
            )
        )

    current_price = float(prepared_prices["story_close"].iloc[-1])
    current_date = prepared_prices["date"].iloc[-1].date().isoformat()
    average_purchase_price = _weighted_average_purchase_price(
        prepared_events
    )

    first_purchase_price: float | None = None
    latest_purchase_price: float | None = None
    first_purchase_date: str | None = None
    latest_purchase_date: str | None = None

    if not prepared_events.empty:
        first_event = prepared_events.iloc[0]
        latest_event = prepared_events.iloc[-1]
        _, first_purchase_price = _nearest_price(
            prepared_prices,
            first_event["transaction_date"],
        )
        _, latest_purchase_price = _nearest_price(
            prepared_prices,
            latest_event["transaction_date"],
        )
        first_purchase_date = first_event[
            "transaction_date"
        ].date().isoformat()
        latest_purchase_date = latest_event[
            "transaction_date"
        ].date().isoformat()

    high_52 = prepared_prices.tail(252)["story_close"].max()
    high_3y = prepared_prices["story_close"].max()
    moving_average_200 = (
        float(prepared_prices["story_close"].tail(200).mean())
        if len(prepared_prices) >= 40
        else None
    )
    return_63d = (
        float(current_price / prepared_prices["story_close"].iloc[-64] - 1)
        if len(prepared_prices) >= 64
        else None
    )
    realized_volatility, volatility_percentile = _volatility_context(
        prepared_prices
    )

    unique_buyers = (
        text_series(prepared_events, "owner_cik")
        .where(
            text_series(prepared_events, "owner_cik").ne(""),
            text_series(prepared_events, "insider_id"),
        )
        .replace("", np.nan)
        .nunique()
        if not prepared_events.empty
        else 0
    )

    summary = {
        "price_date": current_date,
        "current_price": compact_number(current_price),
        "average_reported_purchase_price": compact_number(
            average_purchase_price
        ),
        "percent_vs_average_purchase_price": compact_number(
            (
                current_price / average_purchase_price - 1
            )
            * 100
            if average_purchase_price
            else None
        ),
        "first_purchase_date": first_purchase_date,
        "latest_purchase_date": latest_purchase_date,
        "return_since_first_purchase": compact_number(
            (current_price / first_purchase_price - 1) * 100
            if first_purchase_price
            else None
        ),
        "return_since_latest_purchase": compact_number(
            (current_price / latest_purchase_price - 1) * 100
            if latest_purchase_price
            else None
        ),
        "drawdown_from_52_week_high": compact_number(
            (current_price / float(high_52) - 1) * 100
            if pd.notna(high_52) and high_52 > 0
            else None
        ),
        "drawdown_from_3_year_high": compact_number(
            (current_price / float(high_3y) - 1) * 100
            if pd.notna(high_3y) and high_3y > 0
            else None
        ),
        "distance_from_200_day_average": compact_number(
            (current_price / moving_average_200 - 1) * 100
            if moving_average_200
            else None
        ),
        "return_63_sessions": compact_number(
            return_63d * 100 if return_63d is not None else None
        ),
        "realized_volatility_63d": compact_number(
            realized_volatility * 100
            if realized_volatility is not None
            else None
        ),
        "volatility_percentile": compact_number(volatility_percentile),
        "trend": _trend_label(
            current_price,
            moving_average_200,
            return_63d,
        ),
        "buyers": int(unique_buyers),
        "purchase_days": int(
            prepared_events["transaction_date"].dt.date.nunique()
            if not prepared_events.empty
            else 0
        ),
        "purchase_events": int(len(prepared_events)),
        "total_reported_purchase_value": compact_number(
            numeric_series(
                prepared_events,
                "purchase_value",
                numeric_series(
                    prepared_events,
                    "total_reported_purchase_value",
                    0,
                ),
            ).sum()
            if not prepared_events.empty
            else 0
        ),
    }

    return {
        "schema_version": WEB_SCHEMA_VERSION,
        "generated_at_utc": generated_at_utc,
        "as_of_date": as_of_date,
        "freshness": freshness,
        "ticker": (
            company.get("primary_ticker")
            or company.get("ticker")
            or company.get("yf_ticker")
        ),
        "yf_ticker": company.get("yf_ticker"),
        "issuer_cik": company.get("issuer_cik"),
        "company_name": company.get("company_name")
        or company.get("issuer_name"),
        "sector": company.get("sector"),
        "industry": company.get("industry"),
        "price_available": True,
        "price_unavailable_reason": "",
        "price_path": price_path,
        "purchase_markers": purchase_markers,
        "summary": json_safe(summary),
        "quality": {
            "price_rows_available": int(len(prepared_prices)),
            "price_points_exported": int(len(price_path)),
            "purchase_markers_exported": int(len(purchase_markers)),
            "mapping_quality": company.get("mapping_quality"),
            "metadata_quality": company.get("metadata_quality"),
            "price_quality": company.get("price_quality"),
        },
        "limitations": [
            "Price history comes from yfinance and may be revised or unavailable.",
            "Adjusted closes are used for market context; reported filing prices and values are never rewritten for later splits.",
            "Returns describe what happened after disclosed purchases and are not live score inputs.",
        ],
    }
