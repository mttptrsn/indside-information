"""Build strictly causal executive purchase histories."""

from __future__ import annotations

from datetime import timedelta
from typing import Any

import numpy as np
import pandas as pd

from pipeline.contracts.validation import project_root
from pipeline.utils.atomic import atomic_write_csv_gz, atomic_write_json
from pipeline.utils.io import read_csv_gz
from pipeline.utils.time import utc_now_iso


def _parse_mixed_utc(values: pd.Series) -> pd.Series:
    """Parse mixed SEC dates and ISO timestamps into naive UTC timestamps."""
    parsed = pd.to_datetime(
        values,
        format="mixed",
        errors="coerce",
        utc=True,
    )
    return parsed.dt.tz_convert(None)


def _history_depth(prior_count: int) -> str:
    if prior_count == 0:
        return "no_history"
    if prior_count <= 2:
        return "sparse"
    if prior_count <= 7:
        return "usable"
    return "deep"


def _history_quality(prior_count: int) -> str:
    if prior_count == 0:
        return "limited"
    if prior_count <= 2:
        return "acceptable"
    return "high"


def _safe_float(value: Any) -> float | None:
    if value is None or pd.isna(value):
        return None

    try:
        number = float(value)
    except (TypeError, ValueError):
        return None

    return number if np.isfinite(number) else None


def _safe_iso(value: pd.Timestamp | None) -> str:
    if value is None or pd.isna(value):
        return ""
    return value.date().isoformat()


def _median_gap_days(dates: list[pd.Timestamp]) -> float | None:
    if len(dates) < 2:
        return None

    gaps = [
        (current - previous).total_seconds() / 86_400.0
        for previous, current in zip(dates[:-1], dates[1:])
    ]

    return float(np.median(gaps)) if gaps else None


def _longest_gap_days(dates: list[pd.Timestamp]) -> float | None:
    if len(dates) < 2:
        return None

    gaps = [
        (current - previous).total_seconds() / 86_400.0
        for previous, current in zip(dates[:-1], dates[1:])
    ]

    return float(max(gaps)) if gaps else None


def _historical_percentile(
    current_value: float | None,
    prior_values: pd.Series,
) -> float | None:
    if current_value is None or prior_values.empty:
        return None

    clean = pd.to_numeric(prior_values, errors="coerce").dropna()

    if clean.empty:
        return None

    return float((clean <= current_value).mean() * 100.0)


def build_executive_histories(
    events: pd.DataFrame,
    ticker: str | None = None,
) -> pd.DataFrame:
    """Create one causal history row per purchase event.

    Original event fields are preserved so downstream signal modules can use
    purchase value, ownership, roles, filing dates, and price context directly.
    History calculations use only events strictly earlier than the current
    event timestamp.
    """
    if events.empty:
        return pd.DataFrame()

    required = {
        "event_id",
        "issuer_cik",
        "insider_id",
        "transaction_date",
        "purchase_value",
    }

    missing = sorted(required - set(events.columns))
    if missing:
        raise ValueError(
            f"purchase_events is missing required columns: {missing}"
        )

    working = events.copy()

    if ticker:
        if "ticker" not in working.columns:
            return pd.DataFrame()

        working = working[
            working["ticker"]
            .fillna("")
            .astype(str)
            .str.upper()
            .eq(ticker.upper())
        ].copy()

    if working.empty:
        return pd.DataFrame()

    working["_event_timestamp"] = _parse_mixed_utc(
        working["transaction_date"]
    )

    invalid_dates = working["_event_timestamp"].isna()

    if invalid_dates.any():
        examples = (
            working.loc[invalid_dates, "transaction_date"]
            .astype(str)
            .drop_duplicates()
            .head(20)
            .tolist()
        )
        raise ValueError(
            "Unable to parse transaction_date values: "
            f"{examples}"
        )

    working["purchase_value"] = pd.to_numeric(
        working["purchase_value"],
        errors="coerce",
    )

    if "ownership_increase_percent" not in working.columns:
        working["ownership_increase_percent"] = np.nan
    else:
        working["ownership_increase_percent"] = pd.to_numeric(
            working["ownership_increase_percent"],
            errors="coerce",
        )

    working = working.sort_values(
        [
            "_event_timestamp",
            "issuer_cik",
            "insider_id",
            "event_id",
        ],
        kind="mergesort",
    ).reset_index(drop=True)

    generated_at = utc_now_iso()
    rows: list[dict[str, Any]] = []

    for (_, _), group in working.groupby(
        ["issuer_cik", "insider_id"],
        sort=True,
        dropna=False,
    ):
        group = group.sort_values(
            ["_event_timestamp", "event_id"],
            kind="mergesort",
        ).reset_index(drop=True)

        for _, event in group.iterrows():
            event_time = event["_event_timestamp"]

            # Strictly earlier events only. Same-timestamp events are excluded.
            prior = group[
                group["_event_timestamp"] < event_time
            ].copy()

            prior_dates = (
                prior["_event_timestamp"]
                .dropna()
                .sort_values()
                .tolist()
            )

            prior_values = pd.to_numeric(
                prior["purchase_value"],
                errors="coerce",
            ).dropna()

            prior_ownership = pd.to_numeric(
                prior["ownership_increase_percent"],
                errors="coerce",
            ).dropna()

            prior_count = int(len(prior))
            current_value = _safe_float(event.get("purchase_value"))

            previous_date = prior_dates[-1] if prior_dates else None
            first_date = prior_dates[0] if prior_dates else None

            one_year_start = event_time - timedelta(days=365)
            three_year_start = event_time - timedelta(days=1_095)
            five_year_start = event_time - timedelta(days=1_825)

            days_since_previous = (
                int(
                    (event_time - previous_date).total_seconds()
                    // 86_400
                )
                if previous_date is not None
                else None
            )

            median_gap = _median_gap_days(prior_dates)
            longest_gap = _longest_gap_days(prior_dates)

            # Preserve all original event fields.
            record = {
                key: value
                for key, value in event.to_dict().items()
                if key != "_event_timestamp"
            }

            record.update(
                {
                    "schema_version": "v1",
                    "history_id": f"history:{event['event_id']}",
                    "transaction_date": event_time.isoformat(),
                    "as_of_date": event_time.isoformat(),

                    # Compatibility aliases expected by current signal modules.
                    "purchase_value": current_value,
                    "current_purchase_value": current_value,
                    "median_prior_gap_days": median_gap,
                    "median_days_between_prior_purchases": median_gap,

                    "prior_purchase_count": prior_count,
                    "purchase_count_1y": int(
                        (
                            (prior["_event_timestamp"] >= one_year_start)
                            & (prior["_event_timestamp"] < event_time)
                        ).sum()
                    ),
                    "purchase_count_3y": int(
                        (
                            (prior["_event_timestamp"] >= three_year_start)
                            & (prior["_event_timestamp"] < event_time)
                        ).sum()
                    ),
                    "purchase_count_5y": int(
                        (
                            (prior["_event_timestamp"] >= five_year_start)
                            & (prior["_event_timestamp"] < event_time)
                        ).sum()
                    ),
                    "first_prior_purchase_date": _safe_iso(first_date),
                    "previous_purchase_date": _safe_iso(previous_date),
                    "days_since_previous_purchase": days_since_previous,
                    "longest_prior_gap_days": longest_gap,
                    "prior_median_purchase_value": (
                        float(prior_values.median())
                        if not prior_values.empty
                        else None
                    ),
                    "prior_mean_purchase_value": (
                        float(prior_values.mean())
                        if not prior_values.empty
                        else None
                    ),
                    "largest_prior_purchase_value": (
                        float(prior_values.max())
                        if not prior_values.empty
                        else None
                    ),
                    "prior_purchase_value_percentile": (
                        _historical_percentile(
                            current_value,
                            prior_values,
                        )
                    ),
                    "cumulative_prior_purchase_value": (
                        float(prior_values.sum())
                        if not prior_values.empty
                        else 0.0
                    ),
                    "prior_median_ownership_increase_percent": (
                        float(prior_ownership.median())
                        if not prior_ownership.empty
                        else None
                    ),
                    "history_depth": _history_depth(prior_count),
                    "history_quality": _history_quality(prior_count),
                    "generated_at_utc": generated_at,
                    "quality": _history_quality(prior_count),
                    "quality_flags": (
                        "no_prior_history"
                        if prior_count == 0
                        else (
                            "sparse_prior_history"
                            if prior_count <= 2
                            else ""
                        )
                    ),
                }
            )

            rows.append(record)

    result = pd.DataFrame(rows)

    preferred_columns = [
        "schema_version",
        "history_id",
        "event_id",
        "issuer_cik",
        "insider_id",
        "owner_cik",
        "owner_name",
        "ticker",
        "transaction_date",
        "filing_date",
        "as_of_date",
        "purchase_value",
        "current_purchase_value",
        "total_shares",
        "weighted_average_price",
        "lot_count",
        "ownership_increase_percent",
        "direct_indirect_code",
        "normalized_roles",
        "prior_purchase_count",
        "purchase_count_1y",
        "purchase_count_3y",
        "purchase_count_5y",
        "first_prior_purchase_date",
        "previous_purchase_date",
        "days_since_previous_purchase",
        "median_prior_gap_days",
        "median_days_between_prior_purchases",
        "longest_prior_gap_days",
        "prior_median_purchase_value",
        "prior_mean_purchase_value",
        "largest_prior_purchase_value",
        "prior_purchase_value_percentile",
        "cumulative_prior_purchase_value",
        "prior_median_ownership_increase_percent",
        "history_depth",
        "history_quality",
        "generated_at_utc",
        "quality",
        "quality_flags",
    ]

    ordered = [
        column
        for column in preferred_columns
        if column in result.columns
    ]

    remaining = sorted(
        column
        for column in result.columns
        if column not in ordered
    )

    result = result[ordered + remaining]

    return result.sort_values(
        [
            "transaction_date",
            "issuer_cik",
            "insider_id",
            "event_id",
        ],
        kind="mergesort",
    ).reset_index(drop=True)


def run_build_histories(
    ticker: str | None = None,
) -> dict[str, int]:
    """Read purchase events and write causal executive histories."""
    root = project_root()
    source = root / "data/enriched/purchase_events.csv.gz"
    destination = (
        root
        / "data/enriched/executive_histories.csv.gz"
    )

    if not source.exists():
        raise FileNotFoundError(
            f"Required purchase-event artifact is missing: {source}"
        )

    events = read_csv_gz(source)
    histories = build_executive_histories(
        events,
        ticker=ticker,
    )

    atomic_write_csv_gz(destination, histories)

    depth_counts = (
        histories["history_depth"]
        .value_counts(dropna=False)
        .sort_index()
        .to_dict()
        if not histories.empty
        else {}
    )

    summary = {
        "schema_version": "v1",
        "generated_at_utc": utc_now_iso(),
        "ticker_filter": ticker or "",
        "purchase_event_count": int(len(events)),
        "executive_histories": int(len(histories)),
        "history_depth_counts": depth_counts,
        "source_lineage": {
            "source_type": "purchase_events",
            "source_path": (
                "data/enriched/purchase_events.csv.gz"
            ),
            "parser_version": "v1",
        },
        "quality": (
            "high"
            if not histories.empty
            else "limited"
        ),
    }

    atomic_write_json(
        root / "data/quality/history_summary.json",
        summary,
    )

    return {
        "executive_histories": int(len(histories)),
    }


def build_histories(
    ticker: str | None = None,
) -> dict[str, int]:
    """Public entry point used by the CLI and pipeline runner."""
    return run_build_histories(ticker=ticker)
