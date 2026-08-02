"""Normalize raw ownership XML filings."""

from __future__ import annotations
from pathlib import Path
import pandas as pd
from pipeline.contracts.validation import project_root
from pipeline.ingest.sec_xml import parse_file
from pipeline.normalize.common import lineage_columns, stable_id
from pipeline.utils.time import utc_now_iso

def normalize_filings() -> tuple[pd.DataFrame, list[tuple[Path, object]]]:
    root = project_root()
    parsed = []
    rows = []
    now = utc_now_iso()
    for path in sorted((root / "data/raw/sec/filings").glob("*/*/filing.xml")):
        result = parse_file(path)
        parsed.append((path, result))
        filing = result.filing
        issuer = result.issuer
        accession = filing.get("accession_number") or path.parent.name
        form = filing.get("document_type") or ("4/A" if filing.get("is_amendment") else "4")
        rows.append({
            "schema_version":"v1", "filing_id":stable_id(accession), "accession_number":accession,
            "form_type":form, "issuer_cik":issuer.get("issuer_cik",""), "issuer_name":issuer.get("issuer_name",""),
            "filing_date":filing.get("filing_date",""), "accepted_at_utc":filing.get("accepted_at",""),
            "period_of_report":filing.get("period_of_report",""), "is_amendment":form=="4/A",
            "amendment_description":filing.get("amendment_description",""), "original_accession_number":"",
            "status":"unusable" if result.quality_flags else "active", "generated_at_utc":now,
            "quality":"unusable" if result.quality_flags else "high", "quality_flags":"|".join(result.quality_flags),
            **lineage_columns("sec_xml", str(path.relative_to(root)), accession, now),
        })
    return pd.DataFrame(rows), parsed
