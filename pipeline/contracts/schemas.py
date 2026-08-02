"""Artifact schema names and required fields."""

from __future__ import annotations

from dataclasses import dataclass


QUALITY_LEVELS = ("high", "acceptable", "limited", "unusable")


@dataclass(frozen=True)
class ArtifactSchema:
    name: str
    version: str
    required_fields: tuple[str, ...]


_COMMON = ("schema_version", "source_lineage", "generated_at_utc", "quality")

ARTIFACT_SCHEMAS: dict[str, ArtifactSchema] = {
    "filings": ArtifactSchema("filings", "v1", _COMMON + ("filing_id", "accession_number", "form_type", "issuer_cik", "filing_date")),
    "issuers": ArtifactSchema("issuers", "v1", _COMMON + ("issuer_cik", "issuer_name")),
    "insiders": ArtifactSchema("insiders", "v1", _COMMON + ("insider_id", "canonical_name")),
    "securities": ArtifactSchema("securities", "v1", _COMMON + ("security_id", "issuer_cik", "security_title")),
    "footnotes": ArtifactSchema("footnotes", "v1", _COMMON + ("footnote_id", "accession_number", "footnote_text")),
    "transactions": ArtifactSchema("transactions", "v1", _COMMON + ("transaction_id", "accession_number", "issuer_cik", "transaction_date")),
    "purchase_events": ArtifactSchema("purchase_events", "v1", _COMMON + ("event_id", "issuer_cik", "transaction_date", "purchase_value")),
    "purchase_campaigns": ArtifactSchema("purchase_campaigns", "v1", _COMMON + ("campaign_id", "issuer_cik", "start_date", "end_date", "purchase_value")),
    "executive_histories": ArtifactSchema("executive_histories", "v1", _COMMON + ("history_id", "issuer_cik", "insider_id", "as_of_date")),
    "event_signals": ArtifactSchema("event_signals", "v1", _COMMON + ("signal_id", "event_id", "behavior_change_score")),
    "company_signals": ArtifactSchema("company_signals", "v1", _COMMON + ("company_signal_id", "issuer_cik", "as_of_date", "conviction_score")),
    "rankings": ArtifactSchema("rankings", "v1", _COMMON + ("ranking_id", "category", "rank", "issuer_cik")),
    "quality_reports": ArtifactSchema("quality_reports", "v1", ("schema_version", "quality_id", "artifact_name", "quality", "source_lineage", "generated_at_utc")),
    "pipeline_runs": ArtifactSchema("pipeline_runs", "v1", _COMMON + ("run_id", "status", "started_at_utc")),
    "manifest": ArtifactSchema("manifest", "v1", _COMMON + ("manifest_id", "pipeline_version")),
}


def get_schema(name: str) -> ArtifactSchema:
    try:
        return ARTIFACT_SCHEMAS[name]
    except KeyError as exc:
        raise KeyError(f"Unknown artifact schema: {name}") from exc
