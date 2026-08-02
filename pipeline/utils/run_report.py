"""Machine-readable command run reports."""

from __future__ import annotations
import os, platform, sys, uuid
from pathlib import Path
from typing import Any
from pipeline.contracts.validation import project_root
from pipeline.utils.atomic import atomic_write_json
from pipeline.utils.time import utc_now_iso

def start_report(command: str) -> dict[str,Any]:
    return {"schema_version":"v1","run_id":uuid.uuid4().hex,"command":command,"status":"running",
            "started_at_utc":utc_now_iso(),"finished_at_utc":"","summary":{},"warnings":[],"errors":[],
            "environment":{"python":sys.version.split()[0],"platform":platform.platform()},
            "source_lineage":{"source_type":"pipeline_command","source_path":"pipeline/cli.py","parser_version":"v1"},
            "generated_at_utc":utc_now_iso(),"quality":"acceptable"}

def finish_report(report: dict[str,Any], status: str, summary: dict|None=None, error: str="") -> None:
    report["status"]=status; report["finished_at_utc"]=utc_now_iso(); report["generated_at_utc"]=utc_now_iso()
    report["summary"]=summary or {}
    if error: report["errors"].append(error)
    base=project_root()/"data/quality/pipeline_runs"; base.mkdir(parents=True,exist_ok=True)
    atomic_write_json(base/f"{report['run_id']}.json",report)
    atomic_write_json(project_root()/"data/quality/latest_run.json",report)
