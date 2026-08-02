"""Insider identity normalization without unsafe cross-CIK merging."""

from __future__ import annotations
import pandas as pd
from pipeline.contracts.validation import project_root
from pipeline.normalize.common import clean_name, lineage_columns, stable_id
from pipeline.normalize.roles import normalize_roles
from pipeline.utils.time import utc_now_iso

def normalize_insiders(parsed) -> pd.DataFrame:
    now = utc_now_iso(); rows = {}
    for path, result in parsed:
        cik = result.issuer.get("issuer_cik",""); accession = result.filing.get("accession_number") or path.parent.name
        for owner in result.owners:
            owner_cik = owner.get("owner_cik","")
            key = owner_cik or stable_id(cik, clean_name(owner.get("owner_name","")))
            roles = normalize_roles(owner.get("officer_title",""), owner)
            row = {
                "schema_version":"v1","insider_id":key,"owner_cik":owner_cik,"issuer_cik":cik,
                "canonical_name":clean_name(owner.get("owner_name","")),"display_name":clean_name(owner.get("owner_name","")),
                "raw_officer_title":owner.get("officer_title",""),"normalized_roles":"|".join(roles),
                "first_seen_date":result.filing.get("filing_date",""),"last_seen_date":result.filing.get("filing_date",""),
                "identity_quality":"exact_owner_cik" if owner_cik else "probable_same_issuer_name",
                "generated_at_utc":now,"quality":"high" if owner_cik else "limited","quality_flags":"" if owner_cik else "missing_owner_cik",
                **lineage_columns("sec_xml", str(path.relative_to(project_root())), accession, now),
            }
            if key in rows:
                row["first_seen_date"] = min(filter(None,[rows[key]["first_seen_date"],row["first_seen_date"]]), default="")
                row["last_seen_date"] = max(rows[key]["last_seen_date"],row["last_seen_date"])
                old_roles = set(rows[key]["normalized_roles"].split("|")) if rows[key]["normalized_roles"] else set()
                row["normalized_roles"] = "|".join(sorted(old_roles | set(roles)))
            rows[key] = row
    return pd.DataFrame(rows.values())
