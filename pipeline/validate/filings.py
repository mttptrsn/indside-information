"""Filing validation."""

from __future__ import annotations
import re, pandas as pd
ACCESSION_RE=re.compile(r"^\d{10}-\d{2}-\d{6}$")
CIK_RE=re.compile(r"^\d{10}$")

def validate_filings(frame: pd.DataFrame) -> pd.DataFrame:
    rows=[]
    for row in frame.to_dict("records"):
        errors=[]; warnings=[]
        if not ACCESSION_RE.fullmatch(str(row.get("accession_number",""))): errors.append("invalid_accession")
        if not CIK_RE.fullmatch(str(row.get("issuer_cik",""))): errors.append("invalid_issuer_cik")
        if row.get("form_type") not in {"4","4/A"}: errors.append("invalid_form_type")
        try: pd.Timestamp(row.get("filing_date"))
        except Exception: errors.append("invalid_filing_date")
        quality="unusable" if errors else ("limited" if warnings else "high")
        rows.append({"quality_id":f"filing:{row.get('filing_id','')}","artifact_name":"filings",
            "record_id":row.get("filing_id",""),"quality":quality,"checks_passed":4-len(errors),
            "checks_failed":len(errors),"warnings":"|".join(warnings),"errors":"|".join(errors)})
    return pd.DataFrame(rows)
