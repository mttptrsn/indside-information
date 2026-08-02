from datetime import date
from pathlib import Path
from pipeline.ingest.sec_daily_index import parse_master_index
from pipeline.ingest.sec_filing import extract_ownership_xml

FIX=Path(__file__).parent/"fixtures"

def test_master_index_filters_form4():
    frame=parse_master_index((FIX/"master.idx").read_text(),"2026-07-30")
    assert len(frame)==1
    assert frame.iloc[0]["accession_number"]=="0001234567-26-000001"

def test_extracts_ownership_xml_from_submission():
    xml=(FIX/"form4_purchase.xml").read_text()
    submission=f"<SEC-DOCUMENT><XML>{xml}</XML></SEC-DOCUMENT>"
    extracted=extract_ownership_xml(submission)
    assert b"<ownershipDocument>" in extracted
