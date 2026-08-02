"""Validation orchestration and quality outputs."""

from __future__ import annotations
from pipeline.contracts.validation import project_root
from pipeline.utils.io import read_csv_gz
from pipeline.utils.atomic import atomic_write_csv_gz, atomic_write_json
from pipeline.utils.time import utc_now_iso
from pipeline.validate.filings import validate_filings
from pipeline.validate.identities import validate_identities
from pipeline.validate.transactions import validate_transactions

def validate_sec_artifacts() -> dict[str,int]:
    root=project_root(); normalized=root/"data/normalized"; quality=root/"data/quality"
    filings=read_csv_gz(normalized/"filings.csv.gz",dtype=str,keep_default_na=False)
    issuers=read_csv_gz(normalized/"issuers.csv.gz",dtype=str,keep_default_na=False)
    insiders=read_csv_gz(normalized/"insiders.csv.gz",dtype=str,keep_default_na=False)
    transactions=read_csv_gz(normalized/"transactions.csv.gz")
    filing_q=validate_filings(filings); identity_q=validate_identities(issuers,insiders); tx_q=validate_transactions(transactions)
    atomic_write_csv_gz(quality/"filings.csv.gz",filing_q)
    atomic_write_csv_gz(quality/"identities.csv.gz",identity_q)
    atomic_write_csv_gz(quality/"transactions.csv.gz",tx_q)
    counts={"filings":len(filing_q),"identities":len(identity_q),"transactions":len(tx_q)}
    summary={"schema_version":"v1","generated_at_utc":utc_now_iso(),"counts":counts,
             "unusable":int(sum((frame["quality"]=="unusable").sum() for frame in [filing_q,identity_q,tx_q])),
             "source_lineage":{"source_type":"validation","source_path":"data/normalized","parser_version":"v1"},
             "quality":"acceptable"}
    atomic_write_json(quality/"validation_summary.json",summary)
    return counts
