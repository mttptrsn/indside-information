"""Typed dataclass contracts used by pipeline artifacts."""

from __future__ import annotations

from dataclasses import asdict, dataclass, field, is_dataclass
from datetime import date, datetime
from pathlib import Path
from typing import Any, ClassVar, Mapping

from pipeline.contracts.schemas import QUALITY_LEVELS
from pipeline.contracts.versioning import validate_schema_version
from pipeline.exceptions import ContractValidationError
from pipeline.utils.time import utc_now_iso


def _serialize(value: Any) -> Any:
    if is_dataclass(value):
        return {key: _serialize(item) for key, item in asdict(value).items()}
    if isinstance(value, Mapping):
        return {str(key): _serialize(item) for key, item in value.items()}
    if isinstance(value, (list, tuple, set)):
        return [_serialize(item) for item in value]
    if isinstance(value, (datetime, date)):
        return value.isoformat()
    if isinstance(value, Path):
        return str(value)
    return value


@dataclass
class SourceLineage:
    source_type: str
    source_path: str
    source_identifier: str = ""
    source_sha256: str = ""
    parser_version: str = "v1"

    def validate(self) -> None:
        if not self.source_type.strip():
            raise ContractValidationError("source_type is required.")
        if not self.source_path.strip():
            raise ContractValidationError("source_path is required.")
        validate_schema_version(self.parser_version)

    def to_dict(self) -> dict[str, Any]:
        self.validate()
        return _serialize(self)


@dataclass
class RecordBase:
    schema_version: str
    source_lineage: SourceLineage
    generated_at_utc: str = field(default_factory=utc_now_iso)
    quality: str = "acceptable"
    quality_flags: list[str] = field(default_factory=list)

    REQUIRED_FIELDS: ClassVar[tuple[str, ...]] = ("schema_version", "source_lineage", "generated_at_utc", "quality")

    def validate(self) -> None:
        validate_schema_version(self.schema_version)
        if not isinstance(self.source_lineage, SourceLineage):
            raise ContractValidationError("source_lineage must be SourceLineage.")
        self.source_lineage.validate()
        if not self.generated_at_utc.strip():
            raise ContractValidationError("generated_at_utc is required.")
        if self.quality not in QUALITY_LEVELS:
            raise ContractValidationError(f"quality must be one of {QUALITY_LEVELS}, got {self.quality!r}.")
        for name in self.REQUIRED_FIELDS:
            value = getattr(self, name, None)
            if value is None or value == "":
                raise ContractValidationError(f"{name} is required.")

    def to_dict(self) -> dict[str, Any]:
        self.validate()
        return _serialize(self)


@dataclass
class FilingRecord(RecordBase):
    filing_id: str = ""
    accession_number: str = ""
    form_type: str = ""
    issuer_cik: str = ""
    issuer_name: str = ""
    filing_date: str = ""
    accepted_at_utc: str = ""
    period_of_report: str = ""
    is_amendment: bool = False
    amendment_description: str = ""
    original_accession_number: str = ""
    status: str = "active"
    REQUIRED_FIELDS: ClassVar[tuple[str, ...]] = RecordBase.REQUIRED_FIELDS + ("filing_id","accession_number","form_type","issuer_cik","filing_date")


@dataclass
class IssuerRecord(RecordBase):
    issuer_cik: str = ""
    issuer_name: str = ""
    primary_ticker: str = ""
    exchange: str = ""
    yf_ticker: str = ""
    is_active: bool = True
    mapping_quality: str = "unresolved"
    REQUIRED_FIELDS: ClassVar[tuple[str, ...]] = RecordBase.REQUIRED_FIELDS + ("issuer_cik","issuer_name")


@dataclass
class InsiderRecord(RecordBase):
    insider_id: str = ""
    owner_cik: str = ""
    issuer_cik: str = ""
    canonical_name: str = ""
    display_name: str = ""
    raw_officer_title: str = ""
    normalized_roles: list[str] = field(default_factory=list)
    first_seen_date: str = ""
    last_seen_date: str = ""
    identity_quality: str = "unresolved"
    REQUIRED_FIELDS: ClassVar[tuple[str, ...]] = RecordBase.REQUIRED_FIELDS + ("insider_id","canonical_name")


@dataclass
class SecurityRecord(RecordBase):
    security_id: str = ""
    issuer_cik: str = ""
    ticker: str = ""
    security_title: str = ""
    security_type: str = ""
    exchange: str = ""
    is_common_stock: bool = False
    discovery_eligible: bool = False
    eligibility_reasons: list[str] = field(default_factory=list)
    REQUIRED_FIELDS: ClassVar[tuple[str, ...]] = RecordBase.REQUIRED_FIELDS + ("security_id","issuer_cik","security_title")


@dataclass
class FootnoteRecord(RecordBase):
    footnote_id: str = ""
    accession_number: str = ""
    issuer_cik: str = ""
    footnote_ref: str = ""
    footnote_text: str = ""
    REQUIRED_FIELDS: ClassVar[tuple[str, ...]] = RecordBase.REQUIRED_FIELDS + ("footnote_id","accession_number","footnote_text")


@dataclass
class TransactionRecord(RecordBase):
    transaction_id: str = ""
    accession_number: str = ""
    issuer_cik: str = ""
    insider_id: str = ""
    owner_cik: str = ""
    owner_name: str = ""
    ticker: str = ""
    transaction_date: str = ""
    filing_date: str = ""
    form_type: str = ""
    security_type: str = ""
    security_title: str = ""
    transaction_code: str = ""
    acquired_disposed_code: str = ""
    shares: float | None = None
    price_per_share: float | None = None
    reported_value: float | None = None
    shares_owned_after: float | None = None
    direct_indirect_code: str = ""
    nature_of_ownership: str = ""
    normalized_roles: list[str] = field(default_factory=list)
    footnotes: list[str] = field(default_factory=list)
    is_non_derivative: bool = True
    is_open_market_purchase: bool = False
    is_qualifying_purchase: bool = False
    is_amendment: bool = False
    is_superseded: bool = False
    status: str = "active"
    REQUIRED_FIELDS: ClassVar[tuple[str, ...]] = RecordBase.REQUIRED_FIELDS + ("transaction_id","accession_number","issuer_cik","transaction_date")


@dataclass
class PurchaseEventRecord(RecordBase):
    event_id: str = ""; issuer_cik: str = ""; insider_id: str = ""; ticker: str = ""; transaction_date: str = ""
    accession_numbers: list[str] = field(default_factory=list); total_shares: float = 0.0; purchase_value: float = 0.0
    weighted_average_price: float | None = None; lot_count: int = 0; ownership_increase_percent: float | None = None
    normalized_roles: list[str] = field(default_factory=list)
    REQUIRED_FIELDS: ClassVar[tuple[str, ...]] = RecordBase.REQUIRED_FIELDS + ("event_id","issuer_cik","transaction_date","purchase_value")


@dataclass
class PurchaseCampaignRecord(RecordBase):
    campaign_id: str = ""; issuer_cik: str = ""; insider_id: str = ""; ticker: str = ""; start_date: str = ""; end_date: str = ""
    event_ids: list[str] = field(default_factory=list); purchase_value: float = 0.0; total_shares: float = 0.0; event_count: int = 0
    REQUIRED_FIELDS: ClassVar[tuple[str, ...]] = RecordBase.REQUIRED_FIELDS + ("campaign_id","issuer_cik","start_date","end_date","purchase_value")


@dataclass
class ExecutiveHistoryRecord(RecordBase):
    history_id: str = ""; issuer_cik: str = ""; insider_id: str = ""; as_of_date: str = ""; prior_purchase_count: int = 0
    median_prior_purchase_value: float | None = None; largest_prior_purchase_value: float | None = None
    days_since_previous_purchase: int | None = None; median_prior_gap_days: float | None = None; history_depth: str = "no_history"
    REQUIRED_FIELDS: ClassVar[tuple[str, ...]] = RecordBase.REQUIRED_FIELDS + ("history_id","issuer_cik","insider_id","as_of_date")


@dataclass
class BehaviorSignalRecord(RecordBase):
    signal_id: str = ""; event_id: str = ""; issuer_cik: str = ""; insider_id: str = ""; as_of_date: str = ""
    abnormality_score: float | None = None; silence_break_score: float | None = None; velocity_score: float | None = None
    acceleration_score: float | None = None; ownership_increase_score: float | None = None; behavior_change_score: float = 0.0
    components: dict[str, float | None] = field(default_factory=dict); penalties: dict[str, float] = field(default_factory=dict)
    reason_codes: list[str] = field(default_factory=list)
    REQUIRED_FIELDS: ClassVar[tuple[str, ...]] = RecordBase.REQUIRED_FIELDS + ("signal_id","event_id","behavior_change_score")


@dataclass
class CompanySignalRecord(RecordBase):
    company_signal_id: str = ""; issuer_cik: str = ""; ticker: str = ""; as_of_date: str = ""; conviction_score: float = 0.0
    grade: str = "ordinary"; buyer_count: int = 0; cluster_score: float | None = None
    components: dict[str, float | None] = field(default_factory=dict); penalties: dict[str, float] = field(default_factory=dict)
    reason_codes: list[str] = field(default_factory=list)
    REQUIRED_FIELDS: ClassVar[tuple[str, ...]] = RecordBase.REQUIRED_FIELDS + ("company_signal_id","issuer_cik","as_of_date","conviction_score")


@dataclass
class RankingRecord(RecordBase):
    ranking_id: str = ""; category: str = ""; rank: int = 0; issuer_cik: str = ""; ticker: str = ""; company_name: str = ""
    score: float = 0.0; headline: str = ""; reason_codes: list[str] = field(default_factory=list)
    source_accession_numbers: list[str] = field(default_factory=list)
    REQUIRED_FIELDS: ClassVar[tuple[str, ...]] = RecordBase.REQUIRED_FIELDS + ("ranking_id","category","rank","issuer_cik")


@dataclass
class QualityRecord(RecordBase):
    quality_id: str = ""; artifact_name: str = ""; record_id: str = ""; checks_passed: int = 0; checks_failed: int = 0
    warnings: list[str] = field(default_factory=list); errors: list[str] = field(default_factory=list)
    REQUIRED_FIELDS: ClassVar[tuple[str, ...]] = RecordBase.REQUIRED_FIELDS + ("quality_id","artifact_name")


@dataclass
class PipelineRunRecord(RecordBase):
    run_id: str = ""; command: str = ""; status: str = "pending"; started_at_utc: str = ""; finished_at_utc: str = ""
    stages: dict[str, str] = field(default_factory=dict); input_hashes: dict[str, str] = field(default_factory=dict)
    output_hashes: dict[str, str] = field(default_factory=dict); warnings: list[str] = field(default_factory=list)
    errors: list[str] = field(default_factory=list)
    REQUIRED_FIELDS: ClassVar[tuple[str, ...]] = RecordBase.REQUIRED_FIELDS + ("run_id","status","started_at_utc")


@dataclass
class ManifestRecord(RecordBase):
    manifest_id: str = ""; pipeline_version: str = ""; artifact_count: int = 0
    artifacts: dict[str, dict[str, Any]] = field(default_factory=dict); warnings: list[str] = field(default_factory=list)
    REQUIRED_FIELDS: ClassVar[tuple[str, ...]] = RecordBase.REQUIRED_FIELDS + ("manifest_id","pipeline_version")


ALL_RECORD_TYPES: tuple[type[RecordBase], ...] = (
    FilingRecord, IssuerRecord, InsiderRecord, SecurityRecord, FootnoteRecord, TransactionRecord,
    PurchaseEventRecord, PurchaseCampaignRecord, ExecutiveHistoryRecord, BehaviorSignalRecord,
    CompanySignalRecord, RankingRecord, QualityRecord, PipelineRunRecord, ManifestRecord,
)
