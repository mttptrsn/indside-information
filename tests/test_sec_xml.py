from pathlib import Path
from pipeline.ingest.sec_xml import parse_ownership_xml

FIX=Path(__file__).parent/"fixtures"

def test_parses_purchase_lots_footnote_roles_and_derivative():
    parsed=parse_ownership_xml((FIX/"form4_purchase.xml").read_bytes(),{"accession_number":"0001234567-26-000001","filing_date":"2026-07-30"})
    assert parsed.issuer["issuer_cik"]=="0001234567"
    assert len(parsed.non_derivative_transactions)==2
    assert parsed.non_derivative_transactions[0]["footnote_refs"]==["F1"]
    assert parsed.non_derivative_transactions[1]["direct_indirect_code"]=="I"
    assert len(parsed.derivative_transactions)==1
    assert parsed.derivative_transactions[0]["underlying_security_title"]=="Common Stock"
    assert parsed.footnotes[0]["text"].startswith("Weighted average")

def test_parses_amendment():
    parsed=parse_ownership_xml((FIX/"form4_amendment.xml").read_bytes(),{"accession_number":"0001234567-26-000002"})
    assert parsed.filing["document_type"]=="4/A"
    assert parsed.filing["is_amendment"]

def test_malformed_is_quality_failure_not_exception():
    parsed=parse_ownership_xml((FIX/"malformed.xml").read_bytes())
    assert parsed.quality_flags
    assert parsed.non_derivative_transactions==[]
