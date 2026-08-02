"""Builders for page-oriented and visualization-oriented web payloads."""

from __future__ import annotations

from collections import Counter
from datetime import datetime, timezone
from typing import Any

import numpy as np
import pandas as pd

from pipeline.export.schemas import WEB_SCHEMA_VERSION
from pipeline.export.utils import (
    boolean_series,
    compact_number,
    deterministic_unit,
    json_safe,
    numeric_series,
    records,
    slug,
    split_tokens,
    text_series,
)


def envelope(
    payload: dict[str, Any],
    *,
    generated_at_utc: str,
    as_of_date: str,
    freshness: dict[str, Any],
    limitations: list[str] | None = None,
) -> dict[str, Any]:
    return {
        "schema_version": WEB_SCHEMA_VERSION,
        "generated_at_utc": generated_at_utc,
        "as_of_date": as_of_date,
        "freshness": freshness,
        "limitations": limitations or [],
        **payload,
    }


def quality_summary(*frames: pd.DataFrame) -> dict[str, int]:
    counts: Counter[str] = Counter()
    for frame in frames:
        if frame.empty or "quality" not in frame.columns:
            continue
        counts.update(text_series(frame, "quality", "unknown").str.lower().tolist())
    return dict(sorted(counts.items()))


def latest_rows(frame: pd.DataFrame, key: str, date_column: str) -> pd.DataFrame:
    if frame.empty or key not in frame.columns:
        return frame.copy()
    working = frame.copy()
    working["_sort_date"] = pd.to_datetime(
        working.get(date_column, ""),
        format="mixed",
        errors="coerce",
        utc=True,
    )
    return (
        working.sort_values(["_sort_date", key], kind="mergesort")
        .drop_duplicates(key, keep="last")
        .drop(columns=["_sort_date"])
    )


def normalize_ranking_frame(frame: pd.DataFrame, category: str) -> pd.DataFrame:
    if frame.empty:
        return frame.copy()
    result = frame.copy()
    if "ranking_category" not in result.columns:
        result["ranking_category"] = category
    if "category" not in result.columns:
        result["category"] = result["ranking_category"]
    if "rank" not in result.columns:
        result["rank"] = np.arange(1, len(result) + 1)
    result["_rank"] = pd.to_numeric(result["rank"], errors="coerce").fillna(10**9)
    result["_score"] = numeric_series(
        result,
        "conviction_score",
        numeric_series(result, "score", 0.0),
    )
    result = result.sort_values(
        ["_rank", "_score", "ticker", "issuer_cik"],
        ascending=[True, False, True, True],
        kind="mergesort",
    ).drop(columns=["_rank", "_score"])
    return result.reset_index(drop=True)


def ranking_card(row: dict[str, Any]) -> dict[str, Any]:
    return json_safe(
        {
            "rank": row.get("rank"),
            "category": row.get("ranking_category") or row.get("category"),
            "ticker": row.get("ticker") or row.get("primary_ticker"),
            "issuer_cik": row.get("issuer_cik"),
            "company_name": row.get("company_name") or row.get("issuer_name"),
            "headline": row.get("headline"),
            "purchase_value": row.get("purchase_value"),
            "purchase_multiple": row.get("purchase_multiple"),
            "ownership_increase_percent": row.get("ownership_increase_percent"),
            "buyer_count": row.get("buyer_count"),
            "operating_executive_count": row.get("qualifying_operating_executive_count"),
            "behavior_change_score": row.get("behavior_change_score"),
            "conviction_score": row.get("conviction_score") or row.get("score"),
            "abnormality_score": row.get("abnormality_score"),
            "silence_break_score": row.get("silence_break_score"),
            "cluster_score": row.get("cluster_score"),
            "market_cap": row.get("market_cap"),
            "sector": row.get("sector"),
            "industry": row.get("industry"),
            "transaction_date": row.get("latest_transaction_date")
            or row.get("transaction_date"),
            "filing_date": row.get("latest_filing_date") or row.get("filing_date"),
            "quality": row.get("score_quality") or row.get("quality"),
            "discovery_eligible": row.get("discovery_eligible"),
            "reason_codes": split_tokens(row.get("reason_codes")),
            "source_accession_numbers": split_tokens(
                row.get("source_accession_numbers")
            ),
        }
    )


def build_overview(
    transactions: pd.DataFrame,
    events: pd.DataFrame,
    event_signals: pd.DataFrame,
    company_signals: pd.DataFrame,
    rankings: dict[str, pd.DataFrame],
    companies: pd.DataFrame,
    *,
    generated_at_utc: str,
    as_of_date: str,
    freshness: dict[str, Any],
) -> dict[str, Any]:
    qualifying = (
        int(boolean_series(transactions, "is_qualifying_purchase").sum())
        if not transactions.empty
        else 0
    )
    eligible_companies = (
        int(boolean_series(companies, "discovery_eligible").sum())
        if not companies.empty
        else 0
    )
    exceptional = (
        int((numeric_series(event_signals, "conviction_score") >= 85).sum())
        if not event_signals.empty
        else 0
    )
    clusters = (
        int((numeric_series(event_signals, "cluster_score") > 0).sum())
        if not event_signals.empty
        else 0
    )
    featured = []
    under = rankings.get("under_the_radar", pd.DataFrame())
    if not under.empty:
        featured = [ranking_card(row) for row in under.head(12).to_dict("records")]

    return envelope(
        {
            "counts": {
                "normalized_transactions": int(len(transactions)),
                "qualifying_purchases": qualifying,
                "purchase_events": int(len(events)),
                "event_signals": int(len(event_signals)),
                "company_signals": int(len(company_signals)),
                "companies": int(len(companies)),
                "eligible_companies": eligible_companies,
                "exceptional_signals": exceptional,
                "cluster_signals": clusters,
            },
            "market_pulse": {
                "median_behavior_change": compact_number(
                    numeric_series(event_signals, "behavior_change_score").median()
                    if not event_signals.empty
                    else None
                ),
                "median_conviction": compact_number(
                    numeric_series(event_signals, "conviction_score").median()
                    if not event_signals.empty
                    else None
                ),
                "total_reported_purchase_value": compact_number(
                    numeric_series(events, "purchase_value").sum()
                    if not events.empty
                    else 0
                ),
                "active_company_count": int(
                    text_series(event_signals, "issuer_cik").nunique()
                    if not event_signals.empty
                    else 0
                ),
            },
            "featured_discoveries": featured,
            "quality_summary": quality_summary(
                transactions,
                events,
                event_signals,
                companies,
            ),
        },
        generated_at_utc=generated_at_utc,
        as_of_date=as_of_date,
        freshness=freshness,
        limitations=[
            "Insider purchases are research evidence, not a prediction or recommendation.",
            "SEC filings can be amended and may include indirect ownership or reporting errors.",
            "Price and company metadata use yfinance and may be incomplete or revised.",
        ],
    )


def build_discoveries(
    rankings: dict[str, pd.DataFrame],
    *,
    generated_at_utc: str,
    as_of_date: str,
    freshness: dict[str, Any],
) -> dict[str, Any]:
    sections = {}
    for category, frame in rankings.items():
        sections[category] = {
            "count": int(len(frame)),
            "items": [ranking_card(row) for row in frame.head(100).to_dict("records")],
        }
    return envelope(
        {"sections": sections},
        generated_at_utc=generated_at_utc,
        as_of_date=as_of_date,
        freshness=freshness,
    )


def build_featured(
    rankings: dict[str, pd.DataFrame],
    *,
    generated_at_utc: str,
    as_of_date: str,
    freshness: dict[str, Any],
) -> dict[str, Any]:
    groups = {}
    for category, frame in rankings.items():
        groups[category] = [ranking_card(row) for row in frame.head(8).to_dict("records")]
    return envelope(
        {"groups": groups},
        generated_at_utc=generated_at_utc,
        as_of_date=as_of_date,
        freshness=freshness,
    )


def build_search_index(
    companies: pd.DataFrame,
    insiders: pd.DataFrame,
) -> dict[str, Any]:
    company_rows = []
    for row in companies.to_dict("records"):
        ticker = row.get("primary_ticker") or row.get("ticker") or row.get("yf_ticker")
        company_rows.append(
            json_safe(
                {
                    "type": "company",
                    "id": row.get("issuer_cik"),
                    "slug": slug(ticker or row.get("issuer_cik")),
                    "ticker": ticker,
                    "label": row.get("company_name") or row.get("issuer_name"),
                    "secondary": " · ".join(
                        str(item).strip()
                        for item in [
                            row.get("sector"),
                            row.get("industry"),
                        ]
                        if item is not None
                        and not pd.isna(item)
                        and str(item).strip()
                        and str(item).strip().lower()
                        not in {"nan", "none", "null"}
                    ),
                    "keywords": [
                        ticker,
                        row.get("company_name"),
                        row.get("issuer_name"),
                        row.get("sector"),
                        row.get("industry"),
                    ],
                }
            )
        )
    insider_rows = []
    for row in insiders.to_dict("records"):
        identifier = row.get("owner_cik") or row.get("insider_id")
        insider_rows.append(
            json_safe(
                {
                    "type": "insider",
                    "id": identifier,
                    "slug": slug(identifier),
                    "label": row.get("display_name") or row.get("canonical_name"),
                    "secondary": row.get("raw_officer_title"),
                    "keywords": [
                        row.get("display_name"),
                        row.get("canonical_name"),
                        row.get("raw_officer_title"),
                        *split_tokens(row.get("normalized_roles")),
                    ],
                }
            )
        )
    return {
        "schema_version": WEB_SCHEMA_VERSION,
        "items": company_rows + insider_rows,
    }


def build_sectors(
    companies: pd.DataFrame,
    events: pd.DataFrame,
    event_signals: pd.DataFrame,
    *,
    generated_at_utc: str,
    as_of_date: str,
    freshness: dict[str, Any],
) -> dict[str, Any]:
    company_sector = companies[["issuer_cik"]].copy() if "issuer_cik" in companies else pd.DataFrame()
    if not company_sector.empty:
        company_sector["sector"] = text_series(companies, "sector", "Unclassified").replace("", "Unclassified")
        company_sector["discovery_eligible"] = boolean_series(companies, "discovery_eligible")
    joined = event_signals.copy()
    if not joined.empty and not company_sector.empty:
        joined = joined.merge(company_sector, on="issuer_cik", how="left", suffixes=("", "_company"))
    joined["sector"] = text_series(joined, "sector", "Unclassified").replace("", "Unclassified")

    sectors = []
    eligible_total = max(int(boolean_series(companies, "discovery_eligible").sum()), 1)
    for sector, group in joined.groupby("sector", sort=True):
        sectors.append(
            {
                "sector": sector,
                "signal_count": int(len(group)),
                "company_count": int(text_series(group, "issuer_cik").nunique()),
                "buyer_count": int(text_series(group, "insider_id").nunique()),
                "purchase_value": compact_number(numeric_series(group, "purchase_value").sum()),
                "median_conviction": compact_number(numeric_series(group, "conviction_score").median()),
                "median_behavior_change": compact_number(
                    numeric_series(group, "behavior_change_score").median()
                ),
                "cluster_count": int((numeric_series(group, "cluster_score") > 0).sum()),
                "eligible_universe_share": round(
                    int(text_series(group, "issuer_cik").nunique()) / eligible_total,
                    6,
                ),
            }
        )
    sectors.sort(key=lambda row: (-float(row["median_conviction"] or 0), row["sector"]))
    return envelope(
        {"sectors": sectors},
        generated_at_utc=generated_at_utc,
        as_of_date=as_of_date,
        freshness=freshness,
    )


def build_activity_daily(
    events: pd.DataFrame,
    event_signals: pd.DataFrame,
    *,
    generated_at_utc: str,
    as_of_date: str,
    freshness: dict[str, Any],
) -> dict[str, Any]:
    if events.empty:
        daily = []
    else:
        working = events.copy()
        working["_date"] = pd.to_datetime(
            working.get("transaction_date", ""),
            format="mixed",
            errors="coerce",
            utc=True,
        ).dt.strftime("%Y-%m-%d")
        if not event_signals.empty and "event_id" in event_signals.columns:
            score_columns = [
                column
                for column in [
                    "event_id",
                    "behavior_change_score",
                    "conviction_score",
                    "cluster_score",
                ]
                if column in event_signals.columns
            ]
            working = working.merge(
                event_signals[score_columns].drop_duplicates("event_id"),
                on="event_id",
                how="left",
                suffixes=("", "_signal"),
            )
        daily = []
        for day, group in working.dropna(subset=["_date"]).groupby("_date", sort=True):
            daily.append(
                {
                    "date": day,
                    "event_count": int(len(group)),
                    "company_count": int(text_series(group, "issuer_cik").nunique()),
                    "buyer_count": int(text_series(group, "insider_id").nunique()),
                    "purchase_value": compact_number(numeric_series(group, "purchase_value").sum()),
                    "median_conviction": compact_number(numeric_series(group, "conviction_score").median()),
                    "largest_purchase": compact_number(numeric_series(group, "purchase_value").max()),
                }
            )
    return envelope(
        {"days": daily},
        generated_at_utc=generated_at_utc,
        as_of_date=as_of_date,
        freshness=freshness,
    )


def build_constellation(
    companies: pd.DataFrame,
    company_signals: pd.DataFrame,
    event_signals: pd.DataFrame,
    *,
    generated_at_utc: str,
    as_of_date: str,
    freshness: dict[str, Any],
) -> dict[str, Any]:
    latest = latest_rows(company_signals, "issuer_cik", "as_of_date")
    merged = companies.merge(latest, on="issuer_cik", how="left", suffixes=("", "_signal"))
    sector_names = sorted(
        set(text_series(merged, "sector", "Unclassified").replace("", "Unclassified"))
    )
    sector_index = {sector: index for index, sector in enumerate(sector_names)}
    nodes = []
    for row in merged.to_dict("records"):
        ticker = row.get("primary_ticker") or row.get("ticker") or row.get("yf_ticker")
        identity = str(row.get("issuer_cik") or ticker or row.get("company_name"))
        sector = row.get("sector") or "Unclassified"
        conviction = float(row.get("conviction_score") or 0)
        behavior = float(row.get("behavior_change_score") or 0)
        market_cap = float(row.get("market_cap") or 0)
        orbit = sector_index.get(sector, 0)
        angle = 2 * np.pi * deterministic_unit(identity, "angle")
        jitter = deterministic_unit(identity, "radius")
        radius = 0.25 + 0.65 * jitter
        center_angle = (2 * np.pi * orbit / max(len(sector_names), 1))
        x = 0.5 + np.cos(center_angle + angle * 0.18) * radius * 0.42
        y = 0.5 + np.sin(center_angle + angle * 0.18) * radius * 0.42
        nodes.append(
            {
                "id": identity,
                "ticker": ticker,
                "company_name": row.get("company_name") or row.get("issuer_name"),
                "sector": sector,
                "x": round(float(np.clip(x, 0.03, 0.97)), 6),
                "y": round(float(np.clip(y, 0.03, 0.97)), 6),
                "radius": round(3.0 + min(np.log10(max(market_cap, 1)) / 2.5, 8.0), 4),
                "glow": round(conviction / 100.0, 4),
                "pulse": round(behavior / 100.0, 4),
                "conviction_score": compact_number(conviction),
                "behavior_change_score": compact_number(behavior),
                "discovery_eligible": bool(row.get("discovery_eligible")),
            }
        )
    nodes.sort(key=lambda row: (-float(row["conviction_score"] or 0), str(row["ticker"])))
    return envelope(
        {"nodes": nodes, "sector_order": sector_names},
        generated_at_utc=generated_at_utc,
        as_of_date=as_of_date,
        freshness=freshness,
    )


def build_heartbeat(
    event_signals: pd.DataFrame,
    *,
    generated_at_utc: str,
    as_of_date: str,
    freshness: dict[str, Any],
) -> dict[str, Any]:
    working = event_signals.copy()
    working["_date"] = pd.to_datetime(
        working.get("transaction_date", ""),
        format="mixed",
        errors="coerce",
        utc=True,
    )
    working = working.dropna(subset=["_date"]).sort_values(
        ["_date", "conviction_score", "event_id"],
        ascending=[True, False, True],
        kind="mergesort",
    )
    beats = []
    for row in working.to_dict("records"):
        beats.append(
            json_safe(
                {
                    "event_id": row.get("event_id"),
                    "date": row.get("_date").isoformat() if row.get("_date") is not None else None,
                    "ticker": row.get("ticker"),
                    "company_name": row.get("company_name"),
                    "insider_name": row.get("owner_name"),
                    "purchase_value": row.get("purchase_value"),
                    "amplitude": round(float(row.get("behavior_change_score") or 0) / 100.0, 4),
                    "intensity": round(float(row.get("conviction_score") or 0) / 100.0, 4),
                    "headline": row.get("headline"),
                }
            )
        )
    return envelope(
        {"beats": beats},
        generated_at_utc=generated_at_utc,
        as_of_date=as_of_date,
        freshness=freshness,
    )


def build_ripples(
    event_signals: pd.DataFrame,
    *,
    generated_at_utc: str,
    as_of_date: str,
    freshness: dict[str, Any],
) -> dict[str, Any]:
    working = event_signals.copy()
    working["_value"] = numeric_series(working, "purchase_value")
    working["_conviction"] = numeric_series(working, "conviction_score")
    working = working.sort_values(
        ["_value", "_conviction", "event_id"],
        ascending=[False, False, True],
        kind="mergesort",
    ).head(250)
    maximum = max(float(working["_value"].max()) if not working.empty else 0.0, 1.0)
    ripples = []
    for row in working.to_dict("records"):
        value = float(row.get("_value") or 0)
        ripples.append(
            json_safe(
                {
                    "event_id": row.get("event_id"),
                    "ticker": row.get("ticker"),
                    "company_name": row.get("company_name"),
                    "insider_name": row.get("owner_name"),
                    "date": row.get("transaction_date"),
                    "purchase_value": value,
                    "radius": round(np.sqrt(value / maximum), 6),
                    "conviction_score": row.get("conviction_score"),
                    "behavior_change_score": row.get("behavior_change_score"),
                    "headline": row.get("headline"),
                }
            )
        )
    return envelope(
        {"ripples": ripples},
        generated_at_utc=generated_at_utc,
        as_of_date=as_of_date,
        freshness=freshness,
    )


def build_sector_orbits(
    sectors_payload: dict[str, Any],
    *,
    generated_at_utc: str,
    as_of_date: str,
    freshness: dict[str, Any],
) -> dict[str, Any]:
    sectors = sectors_payload.get("sectors", [])
    maximum = max((float(row.get("purchase_value") or 0) for row in sectors), default=1.0)
    orbits = []
    for index, row in enumerate(sectors):
        orbits.append(
            {
                **row,
                "orbit_index": index,
                "angle": round(
                    2 * np.pi * index / max(len(sectors), 1),
                    6,
                ),
                "relative_mass": round(
                    float(row.get("purchase_value") or 0) / max(maximum, 1.0),
                    6,
                ),
            }
        )
    return envelope(
        {"orbits": orbits},
        generated_at_utc=generated_at_utc,
        as_of_date=as_of_date,
        freshness=freshness,
    )


def build_company_payload(
    company: dict[str, Any],
    events: pd.DataFrame,
    histories: pd.DataFrame,
    event_signals: pd.DataFrame,
    company_signals: pd.DataFrame,
    transactions: pd.DataFrame,
    campaigns: pd.DataFrame,
    *,
    generated_at_utc: str,
    as_of_date: str,
    freshness: dict[str, Any],
) -> dict[str, Any]:
    issuer_cik = str(company.get("issuer_cik") or "")
    ticker = company.get("primary_ticker") or company.get("ticker") or company.get("yf_ticker")
    company_events = events[text_series(events, "issuer_cik").eq(issuer_cik)].copy()
    company_histories = histories[text_series(histories, "issuer_cik").eq(issuer_cik)].copy()
    company_event_signals = event_signals[text_series(event_signals, "issuer_cik").eq(issuer_cik)].copy()
    company_company_signals = company_signals[
        text_series(company_signals, "issuer_cik").eq(issuer_cik)
    ].copy()
    company_transactions = transactions[
        text_series(transactions, "issuer_cik").eq(issuer_cik)
    ].copy()
    company_campaigns = campaigns[text_series(campaigns, "issuer_cik").eq(issuer_cik)].copy()

    for frame, date_column in [
        (company_events, "transaction_date"),
        (company_histories, "transaction_date"),
        (company_event_signals, "transaction_date"),
        (company_transactions, "transaction_date"),
        (company_campaigns, "start_date"),
    ]:
        if not frame.empty and date_column in frame.columns:
            frame["_date"] = pd.to_datetime(
                frame[date_column],
                format="mixed",
                errors="coerce",
                utc=True,
            )
            frame.sort_values("_date", ascending=False, inplace=True, kind="mergesort")
            frame.drop(columns=["_date"], inplace=True)

    current_signal = (
        latest_rows(company_company_signals, "issuer_cik", "as_of_date").tail(1)
        if not company_company_signals.empty
        else pd.DataFrame()
    )
    buyers = []
    if not company_events.empty:
        buyer_columns = [
            column
            for column in [
                "insider_id",
                "owner_cik",
                "owner_name",
                "normalized_roles",
                "purchase_value",
                "transaction_date",
            ]
            if column in company_events.columns
        ]
        buyers_frame = company_events[buyer_columns].copy()
        if "insider_id" in buyers_frame:
            buyers_frame = buyers_frame.drop_duplicates("insider_id", keep="first")
        buyers = records(buyers_frame)

    return envelope(
        {
            "company": json_safe(company),
            "current_signal": records(current_signal, limit=1)[0] if not current_signal.empty else None,
            "latest_event_signal": records(company_event_signals, limit=1)[0]
            if not company_event_signals.empty
            else None,
            "buyers": buyers,
            "purchase_events": records(company_events, limit=250),
            "purchase_campaigns": records(company_campaigns, limit=100),
            "executive_histories": records(company_histories, limit=250),
            "event_signals": records(company_event_signals, limit=250),
            "qualifying_transactions": records(
                company_transactions[
                    boolean_series(company_transactions, "is_qualifying_purchase")
                ],
                limit=500,
            ),
            "stats": {
                "purchase_event_count": int(len(company_events)),
                "unique_buyer_count": int(
                    text_series(company_events, "insider_id").nunique()
                    if not company_events.empty
                    else 0
                ),
                "total_purchase_value": compact_number(
                    numeric_series(company_events, "purchase_value").sum()
                    if not company_events.empty
                    else 0
                ),
                "largest_purchase_value": compact_number(
                    numeric_series(company_events, "purchase_value").max()
                    if not company_events.empty
                    else 0
                ),
                "median_conviction": compact_number(
                    numeric_series(company_event_signals, "conviction_score").median()
                    if not company_event_signals.empty
                    else None
                ),
                "highest_behavior_change": compact_number(
                    numeric_series(company_event_signals, "behavior_change_score").max()
                    if not company_event_signals.empty
                    else None
                ),
            },
        },
        generated_at_utc=generated_at_utc,
        as_of_date=as_of_date,
        freshness=freshness,
        limitations=[
            "Company metadata and prices may be missing for inactive or unsupported symbols.",
            "Indirect ownership should be interpreted with the source filing footnotes.",
        ],
    )


def build_insider_payload(
    insider: dict[str, Any],
    events: pd.DataFrame,
    histories: pd.DataFrame,
    event_signals: pd.DataFrame,
    companies: pd.DataFrame,
    *,
    generated_at_utc: str,
    as_of_date: str,
    freshness: dict[str, Any],
) -> dict[str, Any]:
    insider_id = str(insider.get("insider_id") or insider.get("owner_cik") or "")
    owner_cik = str(insider.get("owner_cik") or "")
    mask_events = text_series(events, "insider_id").eq(insider_id)
    if owner_cik:
        mask_events |= text_series(events, "owner_cik").eq(owner_cik)
    mask_histories = text_series(histories, "insider_id").eq(insider_id)
    if owner_cik:
        mask_histories |= text_series(histories, "owner_cik").eq(owner_cik)
    mask_signals = text_series(event_signals, "insider_id").eq(insider_id)
    if owner_cik:
        mask_signals |= text_series(event_signals, "owner_cik").eq(owner_cik)

    insider_events = events[mask_events].copy()
    insider_histories = histories[mask_histories].copy()
    insider_signals = event_signals[mask_signals].copy()
    company_ids = set(text_series(insider_events, "issuer_cik"))
    related_companies = companies[text_series(companies, "issuer_cik").isin(company_ids)]

    for frame in [insider_events, insider_histories, insider_signals]:
        if not frame.empty and "transaction_date" in frame.columns:
            frame["_date"] = pd.to_datetime(
                frame["transaction_date"],
                format="mixed",
                errors="coerce",
                utc=True,
            )
            frame.sort_values("_date", ascending=False, inplace=True, kind="mergesort")
            frame.drop(columns=["_date"], inplace=True)

    return envelope(
        {
            "insider": json_safe(insider),
            "companies": records(related_companies),
            "purchase_events": records(insider_events, limit=500),
            "histories": records(insider_histories, limit=500),
            "signals": records(insider_signals, limit=500),
            "behavior_profile": {
                "purchase_count": int(len(insider_events)),
                "company_count": int(len(company_ids)),
                "total_purchase_value": compact_number(
                    numeric_series(insider_events, "purchase_value").sum()
                    if not insider_events.empty
                    else 0
                ),
                "median_purchase_value": compact_number(
                    numeric_series(insider_events, "purchase_value").median()
                    if not insider_events.empty
                    else None
                ),
                "largest_purchase_value": compact_number(
                    numeric_series(insider_events, "purchase_value").max()
                    if not insider_events.empty
                    else None
                ),
                "median_days_between_purchases": compact_number(
                    numeric_series(
                        insider_histories,
                        "median_prior_gap_days",
                        numeric_series(
                            insider_histories,
                            "median_days_between_prior_purchases",
                            0,
                        ),
                    ).replace(0, np.nan).median()
                    if not insider_histories.empty
                    else None
                ),
                "highest_behavior_change": compact_number(
                    numeric_series(insider_signals, "behavior_change_score").max()
                    if not insider_signals.empty
                    else None
                ),
                "highest_conviction": compact_number(
                    numeric_series(insider_signals, "conviction_score").max()
                    if not insider_signals.empty
                    else None
                ),
            },
        },
        generated_at_utc=generated_at_utc,
        as_of_date=as_of_date,
        freshness=freshness,
    )
