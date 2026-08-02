"""Atomic static export for the Next.js frontend."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

import pandas as pd

from pipeline import __version__
from pipeline.contracts.validation import project_root
from pipeline.export.company_story import build_company_story
from pipeline.export.builders import (
    build_activity_daily,
    build_company_payload,
    build_constellation,
    build_discoveries,
    build_featured,
    build_heartbeat,
    build_insider_payload,
    build_overview,
    build_ripples,
    build_search_index,
    build_sector_orbits,
    build_sectors,
    normalize_ranking_frame,
)
from pipeline.export.schemas import EXPORT_VERSION, RANKING_CATEGORIES, WEB_SCHEMA_VERSION
from pipeline.export.utils import (
    AtomicDirectory,
    directory_manifest,
    records,
    slug,
    text_series,
    write_json,
)
from pipeline.utils.time import utc_now_iso


def _read_csv(relative: str, *, dtype: Any = None) -> pd.DataFrame:
    path = project_root() / relative
    if not path.exists():
        return pd.DataFrame()
    return pd.read_csv(
        path,
        compression="gzip",
        dtype=dtype,
        keep_default_na=False if dtype is str else True,
    )


def _read_json(relative: str) -> dict[str, Any]:
    path = project_root() / relative
    if not path.exists():
        return {}
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return {}



def _read_company_prices(company: dict[str, Any]) -> pd.DataFrame:
    """Load the canonical raw price file for a company without network access."""
    symbols = [
        company.get("yf_ticker"),
        company.get("primary_ticker"),
        company.get("ticker"),
    ]
    seen: set[str] = set()

    for value in symbols:
        symbol = str(value or "").strip().upper().replace(".", "-")
        if not symbol or symbol in seen:
            continue
        seen.add(symbol)

        path = project_root() / "data/raw/prices" / f"{symbol}.csv.gz"
        if not path.exists():
            continue

        try:
            return pd.read_csv(path, compression="gzip")
        except (OSError, pd.errors.ParserError):
            continue

    return pd.DataFrame()


def _latest_date(frame: pd.DataFrame, column: str) -> str:
    if frame.empty or column not in frame.columns:
        return ""
    parsed = pd.to_datetime(
        frame[column],
        format="mixed",
        errors="coerce",
        utc=True,
    ).dropna()
    return parsed.max().date().isoformat() if not parsed.empty else ""


def _load_inputs() -> dict[str, Any]:
    inputs: dict[str, Any] = {
        "filings": _read_csv("data/normalized/filings.csv.gz", dtype=str),
        "issuers": _read_csv("data/normalized/issuers.csv.gz", dtype=str),
        "insiders": _read_csv("data/normalized/insiders.csv.gz", dtype=str),
        "transactions": _read_csv("data/normalized/transactions.csv.gz"),
        "events": _read_csv("data/enriched/purchase_events.csv.gz"),
        "campaigns": _read_csv("data/enriched/purchase_campaigns.csv.gz"),
        "histories": _read_csv("data/enriched/executive_histories.csv.gz"),
        "companies": _read_csv("data/enriched/company_context.csv.gz"),
        "event_signals": _read_csv("data/signals/event_signals.csv.gz"),
        "company_signals": _read_csv("data/signals/company_signals.csv.gz"),
        "ranking_latest": _read_csv("data/rankings/latest.csv.gz"),
        "sector_activity": _read_csv("data/rankings/sector_activity.csv.gz"),
        "latest_run": _read_json("data/quality/latest_run.json"),
        "normalization_summary": _read_json("data/quality/normalization_summary.json"),
        "price_summary": _read_json("data/quality/price_summary.json"),
        "enrichment_summary": _read_json("data/quality/enrichment_summary.json"),
        "signal_summary": _read_json("data/quality/signal_summary.json"),
    }
    rankings = {}
    for category in RANKING_CATEGORIES:
        frame = _read_csv(f"data/rankings/{category.replace('_', '-')}.csv.gz")
        if frame.empty:
            frame = _read_csv(f"data/rankings/{category}.csv.gz")
        if frame.empty and not inputs["ranking_latest"].empty:
            category_column = (
                "ranking_category"
                if "ranking_category" in inputs["ranking_latest"].columns
                else "category"
            )
            if category_column in inputs["ranking_latest"].columns:
                frame = inputs["ranking_latest"][
                    text_series(inputs["ranking_latest"], category_column)
                    .str.replace("-", "_")
                    .eq(category)
                ].copy()
        rankings[category] = normalize_ranking_frame(frame, category)
    inputs["rankings"] = rankings
    return inputs


def _methodology(generated_at: str, as_of_date: str, freshness: dict[str, Any]) -> dict[str, Any]:
    return {
        "schema_version": WEB_SCHEMA_VERSION,
        "generated_at_utc": generated_at,
        "as_of_date": as_of_date,
        "freshness": freshness,
        "product_principle": (
            "Surface meaningful changes in insider behavior, not raw filing volume."
        ),
        "qualifying_purchase_rule": {
            "form_types": ["4", "4/A"],
            "transaction_code": "P",
            "acquired_disposed_code": "A",
            "non_derivative_only": True,
            "positive_shares_and_price": True,
        },
        "primary_signals": [
            {
                "id": "abnormality",
                "label": "Out of character",
                "description": (
                    "Compares the current purchase with that insider's prior purchase sizes."
                ),
            },
            {
                "id": "silence_break",
                "label": "Quiet buyer returns",
                "description": (
                    "Measures whether an insider bought after an unusually long absence."
                ),
            },
            {
                "id": "cluster",
                "label": "Wolf pack",
                "description": (
                    "Identifies independent operating insiders buying the same company."
                ),
            },
            {
                "id": "ownership",
                "label": "Growing position",
                "description": (
                    "Measures how much the purchase increased reported ownership."
                ),
            },
            {
                "id": "acceleration",
                "label": "Conviction accelerating",
                "description": (
                    "Measures whether purchase size or frequency is increasing across campaigns."
                ),
            },
        ],
        "score_distinction": {
            "behavior_change": (
                "How different the current behavior is from the insider's own history."
            ),
            "conviction": (
                "How strong and interpretable the complete evidence is after context and penalties."
            ),
        },
        "causality": (
            "Historical event scores use only information available before each event. "
            "Forward returns are evaluation-only and are never live score inputs."
        ),
        "limitations": [
            "A purchase can be sincere and still precede poor investment performance.",
            "First-ever purchases have high novelty but limited personal history.",
            "Indirect ownership and filing footnotes can materially change interpretation.",
            "yfinance is an unofficial market-data source.",
        ],
    }


def _status_payload(inputs: dict[str, Any], generated_at: str, as_of_date: str, freshness: dict[str, Any]) -> dict[str, Any]:
    latest_run = inputs["latest_run"]
    return {
        "schema_version": WEB_SCHEMA_VERSION,
        "generated_at_utc": generated_at,
        "as_of_date": as_of_date,
        "freshness": freshness,
        "pipeline": {
            "version": __version__,
            "latest_run_id": latest_run.get("run_id", ""),
            "overall_status": latest_run.get("overall_status", "unknown"),
            "stage_statuses": latest_run.get("stage_statuses", {}),
            "warnings": latest_run.get("warnings", []),
            "errors": latest_run.get("errors", []),
        },
        "source_counts": {
            "filings": int(len(inputs["filings"])),
            "issuers": int(len(inputs["issuers"])),
            "insiders": int(len(inputs["insiders"])),
            "transactions": int(len(inputs["transactions"])),
            "purchase_events": int(len(inputs["events"])),
            "event_signals": int(len(inputs["event_signals"])),
            "company_signals": int(len(inputs["company_signals"])),
        },
        "source_summaries": {
            "normalization": inputs["normalization_summary"],
            "prices": inputs["price_summary"],
            "enrichment": inputs["enrichment_summary"],
            "signals": inputs["signal_summary"],
        },
    }


def export_web(ticker: str | None = None) -> dict[str, Any]:
    """Create all static JSON required by the frontend."""
    inputs = _load_inputs()
    required = {
        "events": "data/enriched/purchase_events.csv.gz",
        "histories": "data/enriched/executive_histories.csv.gz",
        "companies": "data/enriched/company_context.csv.gz",
        "event_signals": "data/signals/event_signals.csv.gz",
        "company_signals": "data/signals/company_signals.csv.gz",
        "ranking_latest": "data/rankings/latest.csv.gz",
    }
    missing = [
        path for name, path in required.items() if inputs[name].empty
    ]
    if missing:
        raise FileNotFoundError(
            "Web export requires completed pipeline artifacts: "
            + ", ".join(missing)
        )

    if ticker:
        ticker_upper = ticker.upper()
        company_mask = (
            text_series(inputs["companies"], "primary_ticker").str.upper().eq(ticker_upper)
            | text_series(inputs["companies"], "ticker").str.upper().eq(ticker_upper)
            | text_series(inputs["companies"], "yf_ticker").str.upper().eq(ticker_upper)
        )
        selected_companies = inputs["companies"][company_mask].copy()
        issuer_ids = set(text_series(selected_companies, "issuer_cik"))
    else:
        selected_companies = inputs["companies"].copy()
        issuer_ids = set(text_series(selected_companies, "issuer_cik"))

    generated_at = utc_now_iso()
    latest_sec = _latest_date(inputs["filings"], "filing_date")
    latest_price = str(
        inputs["latest_run"].get("latest_price_date")
        or inputs["price_summary"].get("latest_price_date")
        or ""
    )
    as_of_date = max(value for value in [latest_sec, latest_price] if value) if (latest_sec or latest_price) else ""
    freshness = {
        "latest_sec_filing_date": latest_sec,
        "latest_price_date": latest_price,
        "exported_at_utc": generated_at,
    }

    destination = project_root() / "web/public/data"
    with AtomicDirectory(destination) as output:
        for directory in [
            "rankings",
            "companies",
            "insiders",
            "history",
            "activity",
            "visualization",
        ]:
            (output / directory).mkdir(parents=True, exist_ok=True)

        rankings = inputs["rankings"]

        overview = build_overview(
            inputs["transactions"],
            inputs["events"],
            inputs["event_signals"],
            inputs["company_signals"],
            rankings,
            inputs["companies"],
            generated_at_utc=generated_at,
            as_of_date=as_of_date,
            freshness=freshness,
        )
        write_json(output / "overview.json", overview)
        write_json(
            output / "discoveries.json",
            build_discoveries(
                rankings,
                generated_at_utc=generated_at,
                as_of_date=as_of_date,
                freshness=freshness,
            ),
        )
        write_json(
            output / "featured.json",
            build_featured(
                rankings,
                generated_at_utc=generated_at,
                as_of_date=as_of_date,
                freshness=freshness,
            ),
        )
        write_json(
            output / "search-index.json",
            build_search_index(inputs["companies"], inputs["insiders"]),
        )

        sectors = build_sectors(
            inputs["companies"],
            inputs["events"],
            inputs["event_signals"],
            generated_at_utc=generated_at,
            as_of_date=as_of_date,
            freshness=freshness,
        )
        write_json(output / "sectors.json", sectors)
        write_json(
            output / "activity/daily.json",
            build_activity_daily(
                inputs["events"],
                inputs["event_signals"],
                generated_at_utc=generated_at,
                as_of_date=as_of_date,
                freshness=freshness,
            ),
        )
        write_json(
            output / "visualization/constellation.json",
            build_constellation(
                inputs["companies"],
                inputs["company_signals"],
                inputs["event_signals"],
                generated_at_utc=generated_at,
                as_of_date=as_of_date,
                freshness=freshness,
            ),
        )
        write_json(
            output / "visualization/heartbeat.json",
            build_heartbeat(
                inputs["event_signals"],
                generated_at_utc=generated_at,
                as_of_date=as_of_date,
                freshness=freshness,
            ),
        )
        write_json(
            output / "visualization/ripples.json",
            build_ripples(
                inputs["event_signals"],
                generated_at_utc=generated_at,
                as_of_date=as_of_date,
                freshness=freshness,
            ),
        )
        write_json(
            output / "visualization/sector-orbits.json",
            build_sector_orbits(
                sectors,
                generated_at_utc=generated_at,
                as_of_date=as_of_date,
                freshness=freshness,
            ),
        )

        ranking_counts = {}
        for category, frame in rankings.items():
            write_json(
                output / f"rankings/{category.replace('_', '-')}.json",
                {
                    "schema_version": WEB_SCHEMA_VERSION,
                    "generated_at_utc": generated_at,
                    "as_of_date": as_of_date,
                    "freshness": freshness,
                    "category": category,
                    "count": int(len(frame)),
                    "items": records(frame),
                },
            )
            ranking_counts[category] = int(len(frame))

        company_index = []
        exported_company_count = 0
        for company in selected_companies.sort_values(
            ["primary_ticker", "issuer_cik"],
            kind="mergesort",
        ).to_dict("records"):
            company_ticker = (
                company.get("primary_ticker")
                or company.get("ticker")
                or company.get("yf_ticker")
            )
            file_slug = slug(company_ticker or company.get("issuer_cik"))
            payload = build_company_payload(
                company,
                inputs["events"],
                inputs["histories"],
                inputs["event_signals"],
                inputs["company_signals"],
                inputs["transactions"],
                inputs["campaigns"],
                generated_at_utc=generated_at,
                as_of_date=as_of_date,
                freshness=freshness,
            )
            write_json(output / f"companies/{file_slug}.json", payload)

            company_events = inputs["events"][
                text_series(inputs["events"], "issuer_cik").eq(
                    str(company.get("issuer_cik") or "")
                )
            ].copy()
            company_event_signals = inputs["event_signals"][
                text_series(inputs["event_signals"], "issuer_cik").eq(
                    str(company.get("issuer_cik") or "")
                )
            ].copy()
            story = build_company_story(
                company,
                _read_company_prices(company),
                company_events,
                company_event_signals,
                generated_at_utc=generated_at,
                as_of_date=as_of_date,
                freshness=freshness,
            )
            write_json(
                output / f"company-stories/{file_slug}.json",
                story,
            )

            write_json(
                output / f"history/{file_slug}.json",
                {
                    "schema_version": WEB_SCHEMA_VERSION,
                    "generated_at_utc": generated_at,
                    "as_of_date": as_of_date,
                    "ticker": company_ticker,
                    "issuer_cik": company.get("issuer_cik"),
                    "events": payload["purchase_events"],
                    "signals": payload["event_signals"],
                },
            )
            company_index.append(
                {
                    "slug": file_slug,
                    "ticker": company_ticker,
                    "issuer_cik": company.get("issuer_cik"),
                    "company_name": company.get("company_name") or company.get("issuer_name"),
                    "sector": company.get("sector"),
                    "industry": company.get("industry"),
                    "market_cap": company.get("market_cap"),
                    "discovery_eligible": company.get("discovery_eligible"),
                    "current_signal": payload.get("current_signal"),
                    "story_path": f"/data/company-stories/{file_slug}.json",
                    "price_available": story.get("price_available", False),
                    "story_summary": story.get("summary", {}),
                }
            )
            exported_company_count += 1

        write_json(
            output / "companies/index.json",
            {
                "schema_version": WEB_SCHEMA_VERSION,
                "generated_at_utc": generated_at,
                "as_of_date": as_of_date,
                "count": len(company_index),
                "items": company_index,
            },
        )

        relevant_insiders = inputs["insiders"]
        if ticker:
            event_insider_ids = set(
                text_series(
                    inputs["events"][
                        text_series(inputs["events"], "issuer_cik").isin(issuer_ids)
                    ],
                    "insider_id",
                )
            )
            relevant_insiders = relevant_insiders[
                text_series(relevant_insiders, "insider_id").isin(event_insider_ids)
            ]

        insider_index = []
        for insider in relevant_insiders.sort_values(
            ["canonical_name", "insider_id"],
            kind="mergesort",
        ).to_dict("records"):
            identifier = insider.get("owner_cik") or insider.get("insider_id")
            file_slug = slug(identifier)
            payload = build_insider_payload(
                insider,
                inputs["events"],
                inputs["histories"],
                inputs["event_signals"],
                inputs["companies"],
                generated_at_utc=generated_at,
                as_of_date=as_of_date,
                freshness=freshness,
            )
            write_json(output / f"insiders/{file_slug}.json", payload)
            insider_index.append(
                {
                    "slug": file_slug,
                    "insider_id": insider.get("insider_id"),
                    "owner_cik": insider.get("owner_cik"),
                    "name": insider.get("display_name") or insider.get("canonical_name"),
                    "roles": insider.get("normalized_roles"),
                    "behavior_profile": payload["behavior_profile"],
                }
            )

        write_json(
            output / "insiders/index.json",
            {
                "schema_version": WEB_SCHEMA_VERSION,
                "generated_at_utc": generated_at,
                "as_of_date": as_of_date,
                "count": len(insider_index),
                "items": insider_index,
            },
        )

        write_json(output / "methodology.json", _methodology(generated_at, as_of_date, freshness))
        write_json(output / "status.json", _status_payload(inputs, generated_at, as_of_date, freshness))

        files = directory_manifest(output)
        manifest = {
            "schema_version": WEB_SCHEMA_VERSION,
            "export_version": EXPORT_VERSION,
            "pipeline_version": __version__,
            "generated_at_utc": generated_at,
            "as_of_date": as_of_date,
            "freshness": freshness,
            "ticker_filter": ticker or "",
            "counts": {
                "files": len(files) + 1,
                "companies": exported_company_count,
                "insiders": len(insider_index),
                "ranking_rows": sum(ranking_counts.values()),
                "purchase_events": int(len(inputs["events"])),
                "event_signals": int(len(inputs["event_signals"])),
                "company_signals": int(len(inputs["company_signals"])),
                "company_stories": exported_company_count,
            },
            "ranking_counts": ranking_counts,
            "files": files,
            "entrypoints": {
                "overview": "/data/overview.json",
                "discoveries": "/data/discoveries.json",
                "featured": "/data/featured.json",
                "search": "/data/search-index.json",
                "sectors": "/data/sectors.json",
                "status": "/data/status.json",
                "methodology": "/data/methodology.json",
                "companies": "/data/companies/index.json",
                "company_stories": "/data/company-stories/",
                "insiders": "/data/insiders/index.json",
                "daily_activity": "/data/activity/daily.json",
                "constellation": "/data/visualization/constellation.json",
                "heartbeat": "/data/visualization/heartbeat.json",
                "ripples": "/data/visualization/ripples.json",
                "sector_orbits": "/data/visualization/sector-orbits.json",
            },
            "limitations": overview["limitations"],
        }
        write_json(output / "manifest.json", manifest)

    return {
        "web_export_files": len(files) + 1,
        "companies": exported_company_count,
        "insiders": len(insider_index),
        "ranking_rows": sum(ranking_counts.values()),
        "destination": str(destination),
        "generated_at_utc": generated_at,
        "schema_version": WEB_SCHEMA_VERSION,
    }
