"""Normalization orchestration."""

from __future__ import annotations
import json
from pipeline.contracts.validation import project_root
from pipeline.normalize.submissions import normalize_filings
from pipeline.normalize.issuers import normalize_issuers
from pipeline.normalize.insiders import normalize_insiders
from pipeline.normalize.securities import normalize_securities
from pipeline.normalize.footnotes import normalize_footnotes
from pipeline.normalize.transactions import normalize_transactions
from pipeline.utils.atomic import atomic_write_csv_gz, atomic_write_json
from pipeline.utils.time import utc_now_iso

def normalize_all() -> dict[str,int]:
    root=project_root(); out=root/"data/normalized"; out.mkdir(parents=True,exist_ok=True)
    filings,parsed=normalize_filings()
    artifacts={
        "filings":filings,"issuers":normalize_issuers(parsed),"insiders":normalize_insiders(parsed),
        "securities":normalize_securities(parsed),"footnotes":normalize_footnotes(parsed),
        "transactions":normalize_transactions(parsed),
    }
    counts={}
    for name,frame in artifacts.items():
        atomic_write_csv_gz(out/f"{name}.csv.gz",frame)
        counts[name]=len(frame)
    atomic_write_json(root/"data/quality/normalization_summary.json",
        {"schema_version":"v1","generated_at_utc":utc_now_iso(),"counts":counts,
         "source_lineage":{"source_type":"normalized_sec_xml","source_path":"data/raw/sec/filings","parser_version":"v1"},
         "quality":"high" if counts["filings"] else "limited"})
    return counts
