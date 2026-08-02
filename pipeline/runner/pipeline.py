"""Pipeline orchestration, resume safety, status, and run reports."""

from __future__ import annotations

import json
import platform
import sys
import uuid
from pathlib import Path

from pipeline import __version__
from pipeline.contracts.validation import config_dir, project_root
from pipeline.runner.stages import STAGES, resolve, validate_inputs
from pipeline.utils.atomic import atomic_write_json
from pipeline.utils.hashing import sha256_file
from pipeline.utils.time import utc_now_iso

CONFIG_FILES = [
    "pipeline.json",
    "scoring.json",
    "universe.json",
    "contracts.json",
    "role_aliases.json",
]


def hashes(paths):
    output = {}
    for path in paths:
        candidate = project_root() / path
        if candidate.is_file():
            output[path] = sha256_file(candidate)
    return output


def config_hashes():
    return {
        name: sha256_file(config_dir() / name)
        for name in CONFIG_FILES
    }


def report_path(run_id):
    return (
        project_root()
        / "data/quality/pipeline_runs"
        / f"{run_id}.json"
    )


def execute(
    stage_names,
    command="run-all",
    ticker=None,
    accession=None,
    skip_network=False,
    resume=None,
    kwargs=None,
):
    kwargs = kwargs or {}
    order = resolve(stage_names)

    if resume:
        path = report_path(resume)
        if not path.exists():
            raise FileNotFoundError(f"Unknown run id: {resume}")
        previous = json.loads(path.read_text())
        if previous.get("config_hashes") != config_hashes():
            raise RuntimeError(
                "Unsafe resume: configuration changed"
            )
        incomplete = {
            name
            for name, status in previous.get(
                "stage_statuses",
                {},
            ).items()
            if status not in {"complete", "skipped"}
        }
        order = [
            name
            for name in order
            if name in incomplete
            or any(
                dependency in incomplete
                for dependency in STAGES[name].dependencies
            )
        ]

    run_id = uuid.uuid4().hex
    started = utc_now_iso()
    statuses = {}
    summaries = {}
    errors = []
    warnings = []
    input_hashes = {}
    output_hashes = {}
    rows = {}

    for name in order:
        stage = STAGES[name]

        if skip_network and stage.network_required:
            statuses[name] = "skipped"
            warnings.append(f"{name}: network stage skipped")
            continue

        try:
            if name not in {
                "contracts",
                "sec_bulk",
                "sec_recent",
            }:
                validate_inputs(stage)

            call_kwargs = dict(kwargs)

            if ticker and stage.supports_ticker:
                call_kwargs["ticker"] = ticker

            if accession and stage.supports_accession:
                call_kwargs["accession"] = accession

            summaries[name] = stage.callable(**call_kwargs)
            statuses[name] = "complete"

            for path in stage.inputs:
                candidate = project_root() / path
                if candidate.is_file():
                    input_hashes[path] = sha256_file(candidate)

            for path in stage.outputs:
                candidate = project_root() / path
                if candidate.is_file():
                    output_hashes[path] = sha256_file(candidate)

            if isinstance(summaries[name], dict):
                rows[name] = {
                    key: value
                    for key, value in summaries[name].items()
                    if isinstance(value, int)
                }

        except Exception as exc:
            statuses[name] = "failed"
            errors.append(f"{name}: {exc}")

            for later in order[order.index(name) + 1 :]:
                if name in STAGES[later].dependencies:
                    statuses.setdefault(later, "blocked")
            break

    overall = (
        "complete"
        if statuses
        and all(
            value in {"complete", "skipped"}
            for value in statuses.values()
        )
        and not errors
        else (
            "partial"
            if any(
                value == "complete"
                for value in statuses.values()
            )
            else "failed"
        )
    )

    report = {
        "schema_version": "v1",
        "run_id": run_id,
        "resumed_from": resume or "",
        "command": command,
        "started_at_utc": started,
        "finished_at_utc": utc_now_iso(),
        "pipeline_version": __version__,
        "config_hashes": config_hashes(),
        "stage_order": order,
        "stage_statuses": statuses,
        "stage_summaries": summaries,
        "input_hashes": input_hashes,
        "output_hashes": output_hashes,
        "row_counts": rows,
        "warnings": warnings,
        "errors": errors,
        "ticker_filter": ticker or "",
        "accession_filter": accession or "",
        "overall_status": overall,
        "environment": {
            "python": sys.version.split()[0],
            "platform": platform.platform(),
        },
        "latest_sec_filing_date": latest_value(
            "data/normalized/filings.csv.gz",
            "filing_date",
        ),
        "latest_price_date": latest_price_date(),
    }

    path = report_path(run_id)
    path.parent.mkdir(parents=True, exist_ok=True)
    atomic_write_json(path, report)
    atomic_write_json(
        project_root() / "data/quality/latest_run.json",
        report,
    )

    return report


def latest_value(path, column):
    import pandas as pd

    candidate = project_root() / path
    if not candidate.exists():
        return ""

    try:
        frame = pd.read_csv(
            candidate,
            compression="gzip",
            usecols=[column],
        )
        if frame.empty:
            return ""
        values = frame[column].dropna().astype(str)
        return values.max() if not values.empty else ""
    except Exception:
        return ""


def latest_price_date():
    import pandas as pd

    values = []
    price_root = project_root() / "data/raw/prices"

    for path in (
        price_root.glob("*.csv.gz")
        if price_root.exists()
        else []
    ):
        try:
            value = pd.read_csv(
                path,
                compression="gzip",
                usecols=["date"],
            )["date"].max()
            values.append(str(value))
        except Exception:
            pass

    return max(values) if values else ""


def _run_time(report):
    return (
        report.get("finished_at_utc")
        or report.get("started_at_utc")
        or ""
    )


def status_snapshot():
    import pandas as pd

    root = project_root()
    runs = []

    run_root = root / "data/quality/pipeline_runs"
    for path in (
        run_root.glob("*.json")
        if run_root.exists()
        else []
    ):
        try:
            runs.append(json.loads(path.read_text()))
        except Exception:
            pass

    runs.sort(key=_run_time)
    complete = [
        report
        for report in runs
        if report.get("overall_status") == "complete"
    ]
    incomplete = [
        report
        for report in runs
        if report.get("overall_status")
        in {"partial", "failed"}
    ]

    def count(path, query=None):
        candidate = root / path
        if not candidate.exists():
            return 0
        try:
            frame = pd.read_csv(
                candidate,
                compression="gzip",
            )
            return (
                int(query(frame).sum())
                if query
                else int(len(frame))
            )
        except Exception:
            return 0

    quality_path = root / "data/quality/transactions.csv.gz"
    warning_count = 0
    if quality_path.exists():
        try:
            quality = pd.read_csv(
                quality_path,
                compression="gzip",
                dtype=str,
                keep_default_na=False,
            )
            if "warnings" in quality.columns:
                warning_count = int(
                    quality["warnings"]
                    .astype(str)
                    .str.strip()
                    .replace(
                        {
                            "nan": "",
                            "None": "",
                            "none": "",
                        }
                    )
                    .ne("")
                    .sum()
                )
        except Exception:
            warning_count = 0

    manifest = root / "web/public/data/manifest.json"
    export_generated_at = ""
    if manifest.exists():
        try:
            export_generated_at = json.loads(
                manifest.read_text()
            ).get("generated_at_utc", "")
        except Exception:
            pass

    latest_rank = root / "data/rankings/latest.csv.gz"

    return {
        "latest_successful_run": (
            complete[-1]["run_id"]
            if complete
            else ""
        ),
        "latest_incomplete_run": (
            incomplete[-1]["run_id"]
            if incomplete
            else ""
        ),
        "artifact_availability": {
            name: all(
                (root / path).exists()
                for path in stage.outputs
            )
            for name, stage in STAGES.items()
        },
        "normalized_transaction_count": count(
            Path("data/normalized/transactions.csv.gz")
        ),
        "qualifying_purchase_count": count(
            Path("data/normalized/transactions.csv.gz"),
            lambda frame: frame[
                "is_qualifying_purchase"
            ]
            .astype(str)
            .str.lower()
            .eq("true"),
        ),
        "latest_sec_filing_date": latest_value(
            "data/normalized/filings.csv.gz",
            "filing_date",
        ),
        "latest_price_date": latest_price_date(),
        "latest_ranking_generation_time": (
            str(
                pd.Timestamp(
                    latest_rank.stat().st_mtime,
                    unit="s",
                    tz="UTC",
                ).isoformat()
            )
            if latest_rank.exists()
            else ""
        ),
        "latest_web_export_time": export_generated_at,
        "outstanding_quality_warnings": warning_count,
    }
