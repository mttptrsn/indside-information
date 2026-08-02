"""Normalize derivative and non-derivative ownership transactions."""

from __future__ import annotations
import math
import pandas as pd
from pipeline.contracts.validation import project_root
from pipeline.normalize.common import lineage_columns, stable_id
from pipeline.normalize.roles import normalize_roles
from pipeline.utils.time import utc_now_iso

def normalize_transactions(parsed) -> pd.DataFrame:
    now=utc_now_iso(); rows=[]
    for path,result in parsed:
        accession=result.filing.get("accession_number") or path.parent.name
        cik=result.issuer.get("issuer_cik",""); ticker=result.issuer.get("ticker","")
        form=result.filing.get("document_type") or ("4/A" if result.filing.get("is_amendment") else "4")
        filing_date=result.filing.get("filing_date","")
        notes={n["id"]:n["text"] for n in result.footnotes}
        owners=result.owners or [{"owner_cik":"","owner_name":"","officer_title":""}]
        for owner in owners:
            insider_id=owner.get("owner_cik") or stable_id(cik,owner.get("owner_name",""))
            roles=normalize_roles(owner.get("officer_title",""),owner)
            for is_non_derivative,items in [(True,result.non_derivative_transactions),(False,result.derivative_transactions)]:
                for tx in items:
                    shares=tx.get("shares"); price=tx.get("price_per_share")
                    value=shares*price if shares is not None and price is not None else None
                    code=tx.get("transaction_code",""); ad=tx.get("acquired_disposed_code","")
                    qualifying=bool(is_non_derivative and code=="P" and ad=="A" and shares and shares>0 and price and price>0)
                    tid=stable_id(accession,insider_id,tx.get("sequence"),tx.get("transaction_date"),
                                  tx.get("security_title"),code,shares,price,tx.get("direct_indirect_code"))
                    refs=tx.get("footnote_refs",[])
                    rows.append({
                        "schema_version":"v1","transaction_id":tid,"accession_number":accession,
                        "issuer_cik":cik,"insider_id":insider_id,"owner_cik":owner.get("owner_cik",""),
                        "owner_name":owner.get("owner_name",""),"ticker":ticker,"transaction_date":tx.get("transaction_date",""),
                        "filing_date":filing_date,"form_type":form,"security_type":"non_derivative" if is_non_derivative else "derivative",
                        "security_title":tx.get("security_title",""),"transaction_code":code,"acquired_disposed_code":ad,
                        "shares":shares,"price_per_share":price,"reported_value":value,"shares_owned_after":tx.get("shares_owned_after"),
                        "direct_indirect_code":tx.get("direct_indirect_code",""),"nature_of_ownership":tx.get("nature_of_ownership",""),
                        "normalized_roles":"|".join(roles),"footnotes":"|".join(notes.get(r,"") for r in refs if notes.get(r)),
                        "is_non_derivative":is_non_derivative,"is_open_market_purchase":is_non_derivative and code=="P",
                        "is_qualifying_purchase":qualifying,"is_amendment":form=="4/A","is_superseded":False,
                        "status":"active","generated_at_utc":now,"quality":"high" if qualifying or not is_non_derivative else "acceptable",
                        "quality_flags":"","footnote_refs":"|".join(refs),
                        **lineage_columns("sec_xml",str(path.relative_to(project_root())),accession,now),
                    })
    frame=pd.DataFrame(rows)
    if frame.empty: return frame
    frame=frame.sort_values(["transaction_id","is_amendment","source_type"], ascending=[True,False,True])
    duplicate=frame.duplicated("transaction_id",keep="first")
    frame.loc[duplicate,"status"]="duplicate"
    frame.loc[duplicate,"quality"]="limited"
    # Amendments supersede matching original economic rows when present.
    amendment_keys=["issuer_cik","owner_cik","transaction_date","security_title","transaction_code","direct_indirect_code"]
    amended=frame[frame["is_amendment"]]
    for _, row in amended.iterrows():
        mask=(~frame["is_amendment"]) & (frame["status"]=="active")
        for key in amendment_keys:
            mask &= frame[key].fillna("").eq(row[key] if pd.notna(row[key]) else "")
        frame.loc[mask,"is_superseded"]=True
        frame.loc[mask,"status"]="superseded"
    return frame.sort_values(["filing_date","accession_number","transaction_id"]).reset_index(drop=True)
