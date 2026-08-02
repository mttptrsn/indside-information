"""Issuer and insider identity validation."""

from __future__ import annotations
import re,pandas as pd
CIK_RE=re.compile(r"^\d{10}$")

def validate_identities(issuers: pd.DataFrame, insiders: pd.DataFrame) -> pd.DataFrame:
    rows=[]
    for artifact,frame,id_col,cik_col in [("issuers",issuers,"issuer_cik","issuer_cik"),("insiders",insiders,"insider_id","owner_cik")]:
        for row in frame.to_dict("records"):
            errors=[]; warnings=[]
            cik=str(row.get(cik_col,""))
            if cik and not CIK_RE.fullmatch(cik): errors.append("invalid_cik")
            if artifact=="insiders" and not cik: warnings.append("missing_owner_cik")
            if not str(row.get("issuer_name" if artifact=="issuers" else "canonical_name","")).strip(): errors.append("missing_name")
            quality="unusable" if errors else ("limited" if warnings else "high")
            rows.append({"quality_id":f"{artifact}:{row.get(id_col,'')}","artifact_name":artifact,
                "record_id":row.get(id_col,""),"quality":quality,"checks_passed":2-len(errors),
                "checks_failed":len(errors),"warnings":"|".join(warnings),"errors":"|".join(errors)})
    return pd.DataFrame(rows)
