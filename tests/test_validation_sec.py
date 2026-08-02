import pandas as pd
from pipeline.validate.filings import validate_filings
from pipeline.validate.transactions import validate_transactions

def test_valid_filing_is_high_quality():
    frame=pd.DataFrame([{"filing_id":"f1","accession_number":"0001234567-26-000001","issuer_cik":"0001234567","form_type":"4","filing_date":"2026-07-30"}])
    assert validate_filings(frame).iloc[0]["quality"]=="high"

def test_derivative_misclassification_is_unusable():
    frame=pd.DataFrame([{"transaction_id":"t1","transaction_code":"P","acquired_disposed_code":"A","transaction_date":"2026-07-29","filing_date":"2026-07-30","shares":10,"price_per_share":2,"reported_value":20,"shares_owned_after":10,"is_qualifying_purchase":True,"is_non_derivative":False}])
    result=validate_transactions(frame).iloc[0]
    assert result["quality"]=="unusable"
    assert "derivative_misclassified" in result["errors"]
