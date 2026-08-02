from pathlib import Path
from pipeline.ingest.sec_xml import parse_ownership_xml
from pipeline.normalize.transactions import normalize_transactions

FIX=Path(__file__).parent/"fixtures"

def parsed_pair(name,accession,filing_date="2026-07-30"):
    parsed=parse_ownership_xml((FIX/name).read_bytes(),{"accession_number":accession,"filing_date":filing_date})
    parsed.filing["accession_number"]=accession
    return (FIX/name,parsed)

def test_derivative_never_qualifies_and_lots_preserved():
    frame=normalize_transactions([parsed_pair("form4_purchase.xml","0001234567-26-000001")])
    assert len(frame)==3
    assert frame["is_qualifying_purchase"].sum()==2
    derivative=frame[~frame["is_non_derivative"]].iloc[0]
    assert not bool(derivative["is_qualifying_purchase"])

def test_amendment_supersedes_matching_original():
    original=parsed_pair("form4_purchase.xml","0001234567-26-000001")
    amended=parsed_pair("form4_amendment.xml","0001234567-26-000002")
    frame=normalize_transactions([original,amended])
    assert (frame["status"]=="superseded").any()

def test_same_name_different_cik_not_merged():
    p1=parsed_pair("form4_purchase.xml","0001234567-26-000001")
    p2=parsed_pair("form4_purchase.xml","0001234567-26-000003")
    p2[1].owners[0]["owner_cik"]="0000000002"
    frame=normalize_transactions([p1,p2])
    assert frame["insider_id"].nunique()==2
