"""Explicit stage registry and dependency resolution."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Callable

from pipeline.contracts.validation import project_root, validate_all_contracts


@dataclass(frozen=True)
class Stage:
    name: str
    dependencies: tuple[str, ...]
    callable: Callable
    inputs: tuple[str, ...]
    outputs: tuple[str, ...]
    supports_ticker: bool = False
    supports_accession: bool = False
    network_required: bool = False
    resumable: bool = True


def _lazy(name):
    def call(**kwargs):
        if name == "contracts":
            return validate_all_contracts()

        if name == "sec_bulk":
            from pipeline.ingest.sec_bulk import ingest_bulk

            return ingest_bulk(kwargs.get("start_year", 2024))

        if name == "sec_recent":
            from pipeline.ingest.sec_daily_index import discover_recent
            from pipeline.ingest.sec_filing import download_filings
            from pipeline.ingest.sec_tickers import ingest_company_tickers

            index = discover_recent(kwargs.get("lookback_days", 10))
            return {
                "tickers": ingest_company_tickers(),
                "discovered": len(index),
                "filings": download_filings(index),
            }

        if name == "normalize":
            from pipeline.normalize import normalize_all

            return normalize_all()

        if name == "validate_sec":
            from pipeline.validate import validate_sec_artifacts

            return validate_sec_artifacts()

        if name == "prices":
            from pipeline.ingest.prices import ingest_prices
            from pipeline.validate.prices import validate_all_prices

            output = ingest_prices(kwargs.get("ticker"))
            output.update(validate_all_prices())
            return output

        if name == "enrich":
            from pipeline.enrich import enrich_all

            return enrich_all(kwargs.get("ticker"))

        if name == "histories":
            from pipeline.enrich import build_histories

            return build_histories(kwargs.get("ticker"))

        if name == "signals":
            import pandas as pd

            from pipeline.signals import write_signals

            root = project_root()
            histories = pd.read_csv(
                root / "data/enriched/executive_histories.csv.gz",
                compression="gzip",
            )
            companies = pd.read_csv(
                root / "data/enriched/company_context.csv.gz",
                compression="gzip",
            )
            if kwargs.get("ticker"):
                histories = histories[
                    histories["ticker"] == kwargs["ticker"]
                ]
                ticker_column = (
                    "primary_ticker"
                    if "primary_ticker" in companies.columns
                    else "ticker"
                )
                companies = companies[
                    companies[ticker_column] == kwargs["ticker"]
                ]
            return write_signals(histories, companies)

        if name == "rankings":
            import pandas as pd

            from pipeline.rankings import write_rankings

            root = project_root()
            events = pd.read_csv(
                root / "data/signals/event_signals.csv.gz",
                compression="gzip",
            )
            companies = pd.read_csv(
                root / "data/enriched/company_context.csv.gz",
                compression="gzip",
            )
            if kwargs.get("ticker"):
                events = events[events["ticker"] == kwargs["ticker"]]
                ticker_column = (
                    "primary_ticker"
                    if "primary_ticker" in companies.columns
                    else "ticker"
                )
                companies = companies[
                    companies[ticker_column] == kwargs["ticker"]
                ]
            return write_rankings(events, companies)

        if name == "export_web":
            from pipeline.export import export_web

            return export_web(kwargs.get("ticker"))

        raise KeyError(name)

    return call


STAGES = {
    "contracts": Stage(
        "contracts",
        (),
        _lazy("contracts"),
        (),
        ("pipeline/config/contracts.json",),
    ),
    "sec_bulk": Stage(
        "sec_bulk",
        ("contracts",),
        _lazy("sec_bulk"),
        (),
        ("data/raw/sec/bulk/download_manifest.csv.gz",),
        network_required=True,
    ),
    "sec_recent": Stage(
        "sec_recent",
        ("contracts",),
        _lazy("sec_recent"),
        (),
        ("data/raw/sec/filings",),
        supports_accession=True,
        network_required=True,
    ),
    "normalize": Stage(
        "normalize",
        ("contracts",),
        _lazy("normalize"),
        ("data/raw/sec/filings",),
        ("data/normalized/transactions.csv.gz",),
        supports_accession=True,
    ),
    "validate_sec": Stage(
        "validate_sec",
        ("normalize",),
        _lazy("validate_sec"),
        ("data/normalized/transactions.csv.gz",),
        ("data/quality/transactions.csv.gz",),
    ),
    "prices": Stage(
        "prices",
        ("normalize",),
        _lazy("prices"),
        ("data/normalized/issuers.csv.gz",),
        ("data/quality/price_summary.json",),
        supports_ticker=True,
        network_required=True,
    ),
    "enrich": Stage(
        "enrich",
        ("validate_sec", "prices"),
        _lazy("enrich"),
        (
            "data/normalized/transactions.csv.gz",
            "data/quality/price_summary.json",
        ),
        ("data/enriched/purchase_events.csv.gz",),
        supports_ticker=True,
    ),
    "histories": Stage(
        "histories",
        ("enrich",),
        _lazy("histories"),
        ("data/enriched/purchase_events.csv.gz",),
        ("data/enriched/executive_histories.csv.gz",),
        supports_ticker=True,
    ),
    "signals": Stage(
        "signals",
        ("histories",),
        _lazy("signals"),
        ("data/enriched/executive_histories.csv.gz",),
        (
            "data/signals/event_signals.csv.gz",
            "data/signals/company_signals.csv.gz",
        ),
        supports_ticker=True,
    ),
    "rankings": Stage(
        "rankings",
        ("signals",),
        _lazy("rankings"),
        ("data/signals/event_signals.csv.gz",),
        ("data/rankings/latest.csv.gz",),
        supports_ticker=True,
    ),
    "export_web": Stage(
        "export_web",
        ("rankings",),
        _lazy("export_web"),
        (
            "data/rankings/latest.csv.gz",
            "data/signals/event_signals.csv.gz",
            "data/signals/company_signals.csv.gz",
            "data/enriched/company_context.csv.gz",
            "data/enriched/executive_histories.csv.gz",
        ),
        ("web/public/data/manifest.json",),
        supports_ticker=True,
    ),
}


def resolve(names):
    order = []
    visiting = set()
    done = set()

    def visit(name):
        if name not in STAGES:
            raise KeyError(f"Unknown stage: {name}")
        if name in visiting:
            raise ValueError("Stage dependency cycle detected")
        if name in done:
            return
        visiting.add(name)
        for dependency in STAGES[name].dependencies:
            visit(dependency)
        visiting.remove(name)
        done.add(name)
        order.append(name)

    for name in names:
        visit(name)

    return order


def validate_inputs(stage):
    missing = [
        path
        for path in stage.inputs
        if not (project_root() / path).exists()
    ]
    if missing:
        raise FileNotFoundError(
            f"Stage {stage.name} missing upstream artifacts: {missing}"
        )
