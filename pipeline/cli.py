"""Command-line interface for the Insider pipeline."""

from __future__ import annotations

import argparse
import json
import sys
from typing import Sequence

import pandas as pd

from pipeline.contracts.validation import project_root, validate_all_contracts
from pipeline.enrich import build_histories, enrich_all
from pipeline.export import export_web
from pipeline.ingest.prices import ingest_prices
from pipeline.ingest.sec_bulk import ingest_bulk
from pipeline.ingest.sec_daily_index import discover_recent
from pipeline.ingest.sec_filing import download_filings
from pipeline.ingest.sec_tickers import ingest_company_tickers
from pipeline.normalize import normalize_all
from pipeline.rankings import write_rankings
from pipeline.runner import STAGES, execute, status_snapshot
from pipeline.signals import write_signals
from pipeline.utils.run_report import finish_report, start_report
from pipeline.validate import validate_sec_artifacts
from pipeline.validate.prices import validate_all_prices


def _run(command, function):
    report = start_report(command)
    try:
        summary = function()
        finish_report(report, "complete", summary)
        return summary
    except Exception as exc:
        finish_report(report, "failed", {}, str(exc))
        raise


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="insider",
        description="SEC insider-purchase research pipeline.",
    )
    subparsers = parser.add_subparsers(dest="command", required=True)

    contracts = subparsers.add_parser("contracts", help="Validate project contracts.")
    contract_subparsers = contracts.add_subparsers(
        dest="contracts_command",
        required=True,
    )
    contract_subparsers.add_parser("validate").set_defaults(handler=_contracts)

    bulk = subparsers.add_parser(
        "ingest-sec-bulk",
        help="Download quarterly SEC history.",
    )
    bulk.add_argument("--start-year", type=int, default=2024)
    bulk.set_defaults(
        handler=lambda args: _print(
            _run(
                "ingest-sec-bulk",
                lambda: ingest_bulk(args.start_year),
            )
        )
    )

    recent = subparsers.add_parser(
        "ingest-sec-recent",
        help="Download recent Forms 4 and 4/A.",
    )
    recent.add_argument("--lookback-days", type=int, default=10)
    recent.set_defaults(handler=_recent)

    subparsers.add_parser(
        "normalize",
        help="Normalize cached SEC filings.",
    ).set_defaults(
        handler=lambda _args: _print(_run("normalize", normalize_all))
    )

    subparsers.add_parser(
        "validate-sec",
        help="Validate normalized SEC artifacts.",
    ).set_defaults(
        handler=lambda _args: _print(
            _run("validate-sec", validate_sec_artifacts)
        )
    )

    commands = [
        ("ingest-prices", "Download and validate yfinance prices", _prices),
        ("enrich", "Build purchase and company enrichment", _enrich),
        ("build-histories", "Build causal executive histories", _histories),
        ("score-signals", "Calculate behavior and conviction signals", _signals),
        ("rank", "Build discovery rankings", _rank),
        ("export-web", "Export static JSON for the Next.js frontend", _export_web),
        ("process", "Run post-normalization stages through rankings", _process),
    ]
    for name, help_text, handler in commands:
        command = subparsers.add_parser(name, help=help_text)
        command.add_argument("--ticker")
        command.set_defaults(handler=handler)

    run_stage = subparsers.add_parser(
        "run-stage",
        help="Run one stage with dependencies.",
    )
    run_stage.add_argument("stage", choices=sorted(STAGES))
    run_stage.add_argument("--ticker")
    run_stage.add_argument("--accession")
    run_stage.add_argument("--skip-sec-download", action="store_true")
    run_stage.set_defaults(handler=_run_stage)

    run_all = subparsers.add_parser(
        "run-all",
        help="Run the complete pipeline.",
    )
    run_all.add_argument("--include-sec-bulk", action="store_true")
    run_all.add_argument("--skip-sec-download", action="store_true")
    run_all.add_argument("--export-web", action="store_true")
    run_all.add_argument("--ticker")
    run_all.add_argument("--accession")
    run_all.add_argument("--resume")
    run_all.add_argument("--start-year", type=int, default=2024)
    run_all.add_argument("--lookback-days", type=int, default=10)
    run_all.set_defaults(handler=_run_all)

    subparsers.add_parser(
        "status",
        help="Show pipeline and artifact status.",
    ).set_defaults(handler=lambda _args: _status())

    return parser


def _print(value):
    print(json.dumps(value, indent=2, default=str) if isinstance(value, dict) else value)
    return 0


def _contracts(_args):
    summary = validate_all_contracts()
    print(
        "Contract validation passed: "
        f"{summary['configuration_files']} configuration files, "
        f"{summary['artifact_schemas']} artifact schemas, "
        f"{summary['record_types']} record types."
    )
    return 0


def _recent(args):
    def work():
        index = discover_recent(args.lookback_days)
        return {
            "tickers": ingest_company_tickers(),
            "discovered": len(index),
            "filings": download_filings(index),
        }

    return _print(_run("ingest-sec-recent", work))


def _prices(args):
    return _print(
        _run(
            "ingest-prices",
            lambda: {**ingest_prices(args.ticker), **validate_all_prices()},
        )
    )


def _enrich(args):
    return _print(_run("enrich", lambda: enrich_all(args.ticker)))


def _histories(args):
    return _print(
        _run("build-histories", lambda: build_histories(args.ticker))
    )


def _signals(args):
    root = project_root()
    histories = pd.read_csv(
        root / "data/enriched/executive_histories.csv.gz",
        compression="gzip",
    )
    companies = pd.read_csv(
        root / "data/enriched/company_context.csv.gz",
        compression="gzip",
    )
    if args.ticker:
        histories = histories[histories["ticker"] == args.ticker]
        ticker_column = (
            "primary_ticker"
            if "primary_ticker" in companies.columns
            else "ticker"
        )
        companies = companies[companies[ticker_column] == args.ticker]
    return _print(
        _run("score-signals", lambda: write_signals(histories, companies))
    )


def _rank(args):
    root = project_root()
    events = pd.read_csv(
        root / "data/signals/event_signals.csv.gz",
        compression="gzip",
    )
    companies = pd.read_csv(
        root / "data/enriched/company_context.csv.gz",
        compression="gzip",
    )
    if args.ticker:
        events = events[events["ticker"] == args.ticker]
        ticker_column = (
            "primary_ticker"
            if "primary_ticker" in companies.columns
            else "ticker"
        )
        companies = companies[companies[ticker_column] == args.ticker]
    return _print(
        _run("rank", lambda: write_rankings(events, companies))
    )


def _export_web(args):
    return _print(
        _run("export-web", lambda: export_web(args.ticker))
    )


def _process(args):
    report = execute(
        ["prices", "enrich", "histories", "signals", "rankings"],
        command="process",
        ticker=args.ticker,
    )
    _print(report)
    return 0 if report["overall_status"] == "complete" else 1


def _run_stage(args):
    report = execute(
        [args.stage],
        command=f"run-stage {args.stage}",
        ticker=args.ticker,
        accession=args.accession,
        skip_network=args.skip_sec_download,
    )
    _print(report)
    return 0 if report["overall_status"] == "complete" else 1


def _run_all(args):
    stages = (
        ["contracts"]
        + (["sec_bulk"] if args.include_sec_bulk else [])
        + [
            "sec_recent",
            "normalize",
            "validate_sec",
            "prices",
            "enrich",
            "histories",
            "signals",
            "rankings",
        ]
        + (["export_web"] if args.export_web else [])
    )
    report = execute(
        stages,
        command="run-all",
        ticker=args.ticker,
        accession=args.accession,
        skip_network=args.skip_sec_download,
        resume=args.resume,
        kwargs={
            "start_year": args.start_year,
            "lookback_days": args.lookback_days,
        },
    )
    _print(report)
    return 0 if report["overall_status"] == "complete" else 1


def _status():
    return _print(status_snapshot())


def main(argv: Sequence[str] | None = None):
    args = build_parser().parse_args(argv)
    try:
        return int(args.handler(args))
    except Exception as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
