"""Normalize SEC filing footnotes."""

from __future__ import annotations
import pandas as pd
from pipeline.contracts.validation import project_root
from pipeline.normalize.common import lineage_columns, stable_id
from pipeline.utils.time import utc_now_iso

def normalize_footnotes(parsed) -> pd.DataFrame:
    now=utc_now_iso(); rows=[]
    for path,result in parsed:
        accession=result.filing.get("accession_number") or path.parent.name; cik=result.issuer.get("issuer_cik","")
        for note in result.footnotes:
            rows.append({"schema_version":"v1","footnote_id":stable_id(accession,note.get("id")),
                "accession_number":accession,"issuer_cik":cik,"footnote_ref":note.get("id",""),
                "footnote_text":note.get("text",""),"generated_at_utc":now,"quality":"high","quality_flags":"",
                **lineage_columns("sec_xml",str(path.relative_to(project_root())),accession,now)})
    return pd.DataFrame(rows)
