"""Security records derived from ownership transactions."""

from __future__ import annotations
import pandas as pd
from pipeline.contracts.validation import project_root
from pipeline.normalize.common import lineage_columns, stable_id
from pipeline.utils.time import utc_now_iso

def normalize_securities(parsed) -> pd.DataFrame:
    now = utc_now_iso(); rows={}
    for path,result in parsed:
        cik=result.issuer.get("issuer_cik",""); ticker=result.issuer.get("ticker",""); accession=result.filing.get("accession_number") or path.parent.name
        for derivative, items in [(False,result.non_derivative_transactions),(True,result.derivative_transactions)]:
            for tx in items:
                title=tx.get("security_title",""); sid=stable_id(cik,title,derivative)
                rows[sid]={"schema_version":"v1","security_id":sid,"issuer_cik":cik,"ticker":ticker,
                    "security_title":title,"security_type":"derivative" if derivative else "non_derivative",
                    "exchange":"","is_common_stock":not derivative and "common" in title.lower(),
                    "discovery_eligible":not derivative,"eligibility_reasons":"",
                    "generated_at_utc":now,"quality":"acceptable","quality_flags":"",
                    **lineage_columns("sec_xml",str(path.relative_to(project_root())),accession,now)}
    return pd.DataFrame(rows.values())
