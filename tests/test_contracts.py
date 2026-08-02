import pytest

from pipeline.contracts.models import FilingRecord, SourceLineage
from pipeline.exceptions import ContractValidationError


def lineage():
    return SourceLineage(
        source_type="fixture",
        source_path="tests/fixtures/form4.xml",
        source_identifier="fixture-1",
        parser_version="v1",
    )


def test_record_serializes_nested_lineage():
    record = FilingRecord(
        schema_version="v1",
        source_lineage=lineage(),
        filing_id="filing-1",
        accession_number="0001234567-26-000001",
        form_type="4",
        issuer_cik="0001234567",
        filing_date="2026-07-31",
        quality="high",
    )
    payload = record.to_dict()
    assert payload["filing_id"] == "filing-1"
    assert payload["source_lineage"]["source_type"] == "fixture"
    assert payload["quality"] == "high"


def test_required_field_validation():
    record = FilingRecord(
        schema_version="v1",
        source_lineage=lineage(),
        filing_id="",
        accession_number="0001234567-26-000001",
        form_type="4",
        issuer_cik="0001234567",
        filing_date="2026-07-31",
    )
    with pytest.raises(ContractValidationError, match="filing_id"):
        record.validate()


def test_quality_must_be_known():
    record = FilingRecord(
        schema_version="v1",
        source_lineage=lineage(),
        filing_id="filing-1",
        accession_number="0001234567-26-000001",
        form_type="4",
        issuer_cik="0001234567",
        filing_date="2026-07-31",
        quality="perfect",
    )
    with pytest.raises(ContractValidationError, match="quality"):
        record.validate()
