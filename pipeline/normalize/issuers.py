"""Issuer normalization keyed by issuer CIK."""

from __future__ import annotations

import json
import re

import pandas as pd

from pipeline.contracts.validation import project_root
from pipeline.normalize.common import lineage_columns
from pipeline.utils.time import utc_now_iso

_VALID_SEC_TICKER = re.compile(r"^[A-Z0-9][A-Z0-9.\-/]{0,14}$")
_INVALID = {"", "N/A", "NA", "NONE", "NULL", "NYSE:", "NASDAQ:", "AMEX:"}


def _ticker_map() -> dict[str, dict]:
    path = project_root() / "data/raw/sec/reference/company_tickers.json"
    if not path.exists():
        return {}
    raw = json.loads(path.read_text())
    values = raw.values() if isinstance(raw, dict) else raw
    return {str(item.get("cik_str", "")).zfill(10): item for item in values}


def _clean_sec_ticker(value: str) -> str:
    ticker = str(value or "").strip().upper().replace(" ", "")
    if ticker.startswith("(") and ticker.endswith(")"):
        ticker = ticker[1:-1].strip()
    if ticker in _INVALID or ticker.isdigit() or not _VALID_SEC_TICKER.fullmatch(ticker):
        return ""
    return ticker


def _to_yfinance_symbol(value: str) -> str:
    ticker = _clean_sec_ticker(value)
    return ticker.replace(".", "-").replace("/", "-") if ticker else ""


def normalize_issuers(parsed) -> pd.DataFrame:
    now = utc_now_iso()
    mapping = _ticker_map()
    rows: dict[str, dict] = {}

    for path, result in parsed:
        issuer = result.issuer
        cik = issuer.get("issuer_cik", "")
        if not cik:
            continue
        reference = mapping.get(cik, {})
        reference_ticker = _clean_sec_ticker(reference.get("ticker", ""))
        filing_ticker = _clean_sec_ticker(issuer.get("ticker", ""))

        # The SEC company-ticker reference is preferred because filing symbols
        # can contain parentheses, exchange labels, stale symbols, or malformed text.
        ticker = reference_ticker or filing_ticker
        mapping_quality = (
            "exact_cik"
            if reference_ticker
            else "filing_symbol"
            if filing_ticker
            else "unresolved"
        )
        quality_flags = []
        if issuer.get("ticker") and not filing_ticker:
            quality_flags.append("invalid_filing_ticker")
        if reference_ticker and filing_ticker and reference_ticker != filing_ticker:
            quality_flags.append("filing_ticker_differs_from_sec_reference")

        rows[cik] = {
            "schema_version": "v1",
            "issuer_cik": cik,
            "issuer_name": issuer.get("issuer_name") or reference.get("title", ""),
            "primary_ticker": ticker,
            "exchange": "",
            "yf_ticker": _to_yfinance_symbol(ticker),
            "is_active": True,
            "mapping_quality": mapping_quality,
            "generated_at_utc": now,
            "quality": "high" if reference_ticker else "acceptable" if filing_ticker else "limited",
            "quality_flags": "|".join(quality_flags),
            **lineage_columns("sec_xml", str(path.relative_to(project_root())), path.parent.name, now),
        }
    return pd.DataFrame(rows.values())
