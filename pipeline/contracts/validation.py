"""Configuration and dataclass contract validation."""

from __future__ import annotations

import json
import math
from dataclasses import fields
from pathlib import Path
from typing import Any

from pipeline.contracts.models import ALL_RECORD_TYPES
from pipeline.contracts.schemas import ARTIFACT_SCHEMAS, QUALITY_LEVELS
from pipeline.contracts.versioning import validate_schema_version
from pipeline.exceptions import ConfigurationError, ContractValidationError

CONFIG_FILENAMES = (
    "pipeline.json",
    "scoring.json",
    "universe.json",
    "contracts.json",
    "role_aliases.json",
)


def project_root() -> Path:
    return Path(__file__).resolve().parents[2]


def config_dir() -> Path:
    return Path(__file__).resolve().parents[1] / "config"


def load_json(path: Path) -> dict[str, Any]:
    try:
        with path.open("r", encoding="utf-8") as handle:
            value = json.load(handle)
    except FileNotFoundError as exc:
        raise ConfigurationError(f"Missing configuration file: {path}") from exc
    except json.JSONDecodeError as exc:
        raise ConfigurationError(f"Invalid JSON in {path}: {exc}") from exc
    if not isinstance(value, dict):
        raise ConfigurationError(f"Top-level JSON value must be an object: {path}")
    return value


def load_all_configs(base: Path | None = None) -> dict[str, dict[str, Any]]:
    directory = base or config_dir()
    return {name: load_json(directory / name) for name in CONFIG_FILENAMES}


def _require_keys(mapping: dict[str, Any], keys: tuple[str, ...], context: str) -> None:
    missing = [key for key in keys if key not in mapping]
    if missing:
        raise ConfigurationError(f"{context} is missing required keys: {missing}")


def _finite_number(value: Any, context: str) -> float:
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        raise ConfigurationError(f"{context} must be numeric.")
    number = float(value)
    if not math.isfinite(number):
        raise ConfigurationError(f"{context} must be finite.")
    return number


def _validate_weight_group(mapping: dict[str, Any], context: str) -> None:
    if not mapping:
        raise ConfigurationError(f"{context} cannot be empty.")
    total = 0.0
    for name, raw in mapping.items():
        value = _finite_number(raw, f"{context}.{name}")
        if value < 0 or value > 1:
            raise ConfigurationError(f"{context}.{name} must be between 0 and 1.")
        total += value
    if not math.isclose(total, 1.0, abs_tol=1e-9):
        raise ConfigurationError(f"{context} must sum to 1.0; got {total:.12f}.")


def validate_pipeline_config(config: dict[str, Any]) -> None:
    _require_keys(
        config,
        (
            "schema_version",
            "project_name",
            "pipeline_version",
            "sec",
            "prices",
            "atomic_writes",
            "storage",
            "logging",
        ),
        "pipeline.json",
    )
    validate_schema_version(config["schema_version"])
    sec = config["sec"]
    _require_keys(
        sec,
        (
            "user_agent",
            "request_rate_per_second",
            "timeout_seconds",
            "retry_attempts",
            "recent_lookback_days",
            "bulk_history_start_year",
            "cache_enabled",
        ),
        "pipeline.json.sec",
    )
    rate = _finite_number(sec["request_rate_per_second"], "SEC request rate")
    if not 0 < rate < 10:
        raise ConfigurationError("SEC request rate must be greater than 0 and below 10.")
    timeout = _finite_number(sec["timeout_seconds"], "SEC timeout")
    if timeout <= 0:
        raise ConfigurationError("SEC timeout must be positive.")
    if not isinstance(sec["retry_attempts"], int) or sec["retry_attempts"] < 0:
        raise ConfigurationError("SEC retry_attempts must be a nonnegative integer.")
    if not isinstance(sec["recent_lookback_days"], int) or sec["recent_lookback_days"] < 1:
        raise ConfigurationError("SEC recent_lookback_days must be a positive integer.")
    prices = config["prices"]
    _require_keys(
        prices,
        ("source", "history_start", "overlap_days", "auto_adjust"),
        "pipeline.json.prices",
    )
    if prices["source"] != "yfinance":
        raise ConfigurationError("The configured price source must be yfinance.")
    if prices["auto_adjust"] is not False:
        raise ConfigurationError("prices.auto_adjust must be false.")
    if not isinstance(prices["overlap_days"], int) or prices["overlap_days"] < 1:
        raise ConfigurationError("prices.overlap_days must be a positive integer.")
    storage = config["storage"]
    _require_keys(
        storage,
        (
            "raw_root",
            "normalized_root",
            "enriched_root",
            "signals_root",
            "rankings_root",
            "quality_root",
            "web_export_root",
            "tabular_format",
            "metadata_format",
        ),
        "pipeline.json.storage",
    )
    if storage["tabular_format"] != "csv.gz":
        raise ConfigurationError("Tabular format must be csv.gz.")
    if storage["metadata_format"] != "json":
        raise ConfigurationError("Metadata format must be json.")
    if config["logging"].get("level") not in {"DEBUG", "INFO", "WARNING", "ERROR"}:
        raise ConfigurationError("Unsupported logging level.")


def validate_scoring_config(config: dict[str, Any]) -> None:
    _require_keys(
        config,
        (
            "schema_version",
            "thresholds",
            "history_depth",
            "cluster_windows_days",
            "purchase_campaign_gap_trading_days",
            "behavior_change_weights",
            "conviction_weights",
            "quality_penalties",
            "role_quality",
        ),
        "scoring.json",
    )
    validate_schema_version(config["schema_version"])
    thresholds = config["thresholds"]
    _require_keys(
        thresholds,
        (
            "minimum_purchase_value_usd",
            "preferred_market_cap_min_usd",
            "preferred_market_cap_max_usd",
            "minimum_stock_price_usd",
            "minimum_average_dollar_volume_usd",
            "abnormal_purchase_multiple",
            "silence_break_days",
            "meaningful_ownership_increase_percent",
            "velocity_window_days",
            "acceleration_minimum_events",
        ),
        "scoring.json.thresholds",
    )
    for name, raw in thresholds.items():
        number = _finite_number(raw, f"scoring threshold {name}")
        if number < 0:
            raise ConfigurationError(f"scoring threshold {name} cannot be negative.")
    if thresholds["preferred_market_cap_min_usd"] >= thresholds["preferred_market_cap_max_usd"]:
        raise ConfigurationError("Preferred market-cap minimum must be below maximum.")
    history = config["history_depth"]
    if history != {"no_history": 0, "sparse_max": 2, "usable_max": 7, "deep_min": 8}:
        raise ConfigurationError("history_depth must use the declared contiguous thresholds.")
    windows = config["cluster_windows_days"]
    if not isinstance(windows, list) or not windows or any(
        not isinstance(value, int) or value <= 0 for value in windows
    ):
        raise ConfigurationError("cluster_windows_days must contain positive integers.")
    if windows != sorted(set(windows)):
        raise ConfigurationError("cluster_windows_days must be unique and sorted.")
    _validate_weight_group(config["behavior_change_weights"], "behavior_change_weights")
    _validate_weight_group(config["conviction_weights"], "conviction_weights")
    for group in ("quality_penalties", "role_quality"):
        for name, raw in config[group].items():
            number = _finite_number(raw, f"{group}.{name}")
            if number < 0:
                raise ConfigurationError(f"{group}.{name} cannot be negative.")


def validate_universe_config(config: dict[str, Any]) -> None:
    _require_keys(
        config,
        (
            "schema_version",
            "country",
            "listing_scope",
            "eligibility",
            "excluded_security_types",
            "preserve_ineligible_records",
        ),
        "universe.json",
    )
    validate_schema_version(config["schema_version"])
    eligibility = config["eligibility"]
    _require_keys(
        eligibility,
        (
            "market_cap_min_usd",
            "market_cap_max_usd",
            "minimum_price_usd",
            "minimum_average_dollar_volume_usd",
            "require_operating_company",
            "require_common_stock",
        ),
        "universe.json.eligibility",
    )
    if eligibility["market_cap_min_usd"] >= eligibility["market_cap_max_usd"]:
        raise ConfigurationError("Universe market-cap minimum must be below maximum.")
    if config["preserve_ineligible_records"] is not True:
        raise ConfigurationError("Ineligible records must be preserved.")
    if not config["excluded_security_types"]:
        raise ConfigurationError("excluded_security_types cannot be empty.")


def validate_contracts_config(config: dict[str, Any]) -> None:
    _require_keys(config, ("schema_version", "artifacts"), "contracts.json")
    validate_schema_version(config["schema_version"])
    artifacts = config["artifacts"]
    if set(artifacts) != set(ARTIFACT_SCHEMAS):
        missing = sorted(set(ARTIFACT_SCHEMAS) - set(artifacts))
        extra = sorted(set(artifacts) - set(ARTIFACT_SCHEMAS))
        raise ConfigurationError(
            f"Artifact declarations do not match schemas; missing={missing}, extra={extra}."
        )
    for name, declaration in artifacts.items():
        _require_keys(declaration, ("schema_version", "path", "format"), f"artifact {name}")
        version = validate_schema_version(declaration["schema_version"])
        if version != ARTIFACT_SCHEMAS[name].version:
            raise ConfigurationError(
                f"Artifact {name} declares {version}, expected {ARTIFACT_SCHEMAS[name].version}."
            )
        if declaration["format"] not in {"csv.gz", "json"}:
            raise ConfigurationError(f"Unsupported format for artifact {name}.")


def validate_role_aliases_config(config: dict[str, Any]) -> None:
    _require_keys(config, ("schema_version", "roles"), "role_aliases.json")
    validate_schema_version(config["schema_version"])
    roles = config["roles"]
    required = {
        "founder",
        "co_founder",
        "ceo",
        "interim_ceo",
        "president_and_ceo",
        "cfo",
        "interim_cfo",
        "coo",
        "president",
        "chairman",
        "executive_chairman",
        "director",
        "ten_percent_owner",
        "other_officer",
    }
    missing = sorted(required - set(roles))
    if missing:
        raise ConfigurationError(f"role_aliases.json is missing roles: {missing}")
    for name, role in roles.items():
        _require_keys(role, ("aliases", "priority", "normalized_roles"), f"role {name}")
        if not role["aliases"]:
            raise ConfigurationError(f"role {name} must have at least one alias.")
        priority = _finite_number(role["priority"], f"role {name} priority")
        if not 0 <= priority <= 100:
            raise ConfigurationError(f"role {name} priority must be between 0 and 100.")


def validate_dataclass_contracts() -> None:
    known_versions = {schema.version for schema in ARTIFACT_SCHEMAS.values()}
    for record_type in ALL_RECORD_TYPES:
        field_names = {item.name for item in fields(record_type)}
        missing = set(record_type.REQUIRED_FIELDS) - field_names
        if missing:
            raise ContractValidationError(
                f"{record_type.__name__} required fields are not dataclass fields: {sorted(missing)}"
            )
        if "schema_version" not in field_names:
            raise ContractValidationError(f"{record_type.__name__} lacks schema_version.")
        if not known_versions:
            raise ContractValidationError("No known artifact schema versions.")


def validate_all_contracts(base: Path | None = None) -> dict[str, Any]:
    configs = load_all_configs(base)
    validate_pipeline_config(configs["pipeline.json"])
    validate_scoring_config(configs["scoring.json"])
    validate_universe_config(configs["universe.json"])
    validate_contracts_config(configs["contracts.json"])
    validate_role_aliases_config(configs["role_aliases.json"])
    validate_dataclass_contracts()
    return {
        "configuration_files": len(configs),
        "artifact_schemas": len(ARTIFACT_SCHEMAS),
        "record_types": len(ALL_RECORD_TYPES),
        "quality_levels": list(QUALITY_LEVELS),
    }
