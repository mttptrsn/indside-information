"""Post-normalization enrichment orchestration."""

from __future__ import annotations

import pandas as pd

from pipeline.contracts.validation import project_root
from pipeline.enrich.company_context import enrich_companies
from pipeline.enrich.executive_history import build_executive_histories
from pipeline.enrich.price_context import add_price_context
from pipeline.enrich.purchase_groups import (
    build_purchase_campaigns,
    build_purchase_events,
)
from pipeline.ingest.company_metadata import fetch_company_metadata
from pipeline.utils.atomic import atomic_write_csv_gz, atomic_write_json
from pipeline.utils.time import utc_now_iso


def price_loader(ticker: str) -> pd.DataFrame:
    """Load locally cached yfinance history for one ticker."""
    normalized_ticker = str(ticker).replace(".", "-")
    path = (
        project_root()
        / "data"
        / "raw"
        / "prices"
        / f"{normalized_ticker}.csv.gz"
    )

    if not path.exists():
        return pd.DataFrame()

    return pd.read_csv(path, compression="gzip")


def enrich_all(ticker: str | None = None) -> dict[str, int]:
    """Build purchase events, campaigns, price context, and company context."""
    root = project_root()

    transactions_path = root / "data/normalized/transactions.csv.gz"
    issuers_path = root / "data/normalized/issuers.csv.gz"

    if not transactions_path.exists():
        raise FileNotFoundError(
            f"Required transaction artifact is missing: {transactions_path}"
        )

    if not issuers_path.exists():
        raise FileNotFoundError(
            f"Required issuer artifact is missing: {issuers_path}"
        )

    transactions = pd.read_csv(
        transactions_path,
        compression="gzip",
    )

    issuers = pd.read_csv(
        issuers_path,
        compression="gzip",
        dtype=str,
        keep_default_na=False,
    )

    if ticker:
        ticker_upper = ticker.upper()

        if "ticker" in transactions.columns:
            transactions = transactions[
                transactions["ticker"]
                .fillna("")
                .astype(str)
                .str.upper()
                .eq(ticker_upper)
            ].copy()

        issuer_ticker_column = (
            "primary_ticker"
            if "primary_ticker" in issuers.columns
            else "yf_ticker"
        )

        if issuer_ticker_column in issuers.columns:
            issuers = issuers[
                issuers[issuer_ticker_column]
                .fillna("")
                .astype(str)
                .str.upper()
                .eq(ticker_upper)
            ].copy()

    events = build_purchase_events(transactions)

    if not events.empty:
        events = add_price_context(events, price_loader)

    campaigns = build_purchase_campaigns(events)

    companies = enrich_companies(
        issuers,
        fetch_company_metadata,
        price_loader,
    )

    enriched_root = root / "data/enriched"
    enriched_root.mkdir(parents=True, exist_ok=True)

    atomic_write_csv_gz(
        enriched_root / "purchase_events.csv.gz",
        events,
    )

    atomic_write_csv_gz(
        enriched_root / "purchase_campaigns.csv.gz",
        campaigns,
    )

    atomic_write_csv_gz(
        enriched_root / "company_context.csv.gz",
        companies,
    )

    summary = {
        "schema_version": "v1",
        "generated_at_utc": utc_now_iso(),
        "ticker_filter": ticker or "",
        "purchase_events": int(len(events)),
        "purchase_campaigns": int(len(campaigns)),
        "companies": int(len(companies)),
        "source_lineage": {
            "source_type": "normalized_artifacts",
            "source_path": "data/normalized",
            "parser_version": "v1",
        },
        "quality": "high" if len(events) else "limited",
    }

    atomic_write_json(
        root / "data/quality/enrichment_summary.json",
        summary,
    )

    return {
        "purchase_events": int(len(events)),
        "purchase_campaigns": int(len(campaigns)),
        "companies": int(len(companies)),
    }


def build_histories(ticker: str | None = None) -> dict[str, int]:
    """Build causal executive purchase histories."""
    root = project_root()
    events_path = root / "data/enriched/purchase_events.csv.gz"

    if not events_path.exists():
        raise FileNotFoundError(
            f"Required purchase-event artifact is missing: {events_path}"
        )

    events = pd.read_csv(
        events_path,
        compression="gzip",
    )

    if ticker and "ticker" in events.columns:
        events = events[
            events["ticker"]
            .fillna("")
            .astype(str)
            .str.upper()
            .eq(ticker.upper())
        ].copy()

    histories = build_executive_histories(events)

    atomic_write_csv_gz(
        root / "data/enriched/executive_histories.csv.gz",
        histories,
    )

    summary = {
        "schema_version": "v1",
        "generated_at_utc": utc_now_iso(),
        "ticker_filter": ticker or "",
        "purchase_event_count": int(len(events)),
        "executive_histories": int(len(histories)),
        "source_lineage": {
            "source_type": "purchase_events",
            "source_path": "data/enriched/purchase_events.csv.gz",
            "parser_version": "v1",
        },
        "quality": "high" if len(histories) else "limited",
    }

    atomic_write_json(
        root / "data/quality/history_summary.json",
        summary,
    )

    return {
        "executive_histories": int(len(histories)),
    }


__all__ = [
    "build_histories",
    "enrich_all",
    "price_loader",
]
