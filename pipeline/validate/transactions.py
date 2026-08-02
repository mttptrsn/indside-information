"""Structural and economic validation for normalized insider transactions."""

from __future__ import annotations

import math
import re
from datetime import date
from typing import Any

import pandas as pd


KNOWN_CODES = {
    "P",
    "S",
    "A",
    "D",
    "F",
    "M",
    "C",
    "G",
    "J",
    "K",
    "U",
    "W",
    "X",
    "Z",
    "L",
    "I",
}

_COMPACT_DATE = re.compile(r"^\d{8}$")


def _parse_date(value: Any) -> date | None:
    """Parse SEC compact dates and mixed ISO timestamps consistently."""
    if value is None or pd.isna(value):
        return None

    text = str(value).strip()

    if not text or text.lower() in {"nan", "none", "nat"}:
        return None

    try:
        if _COMPACT_DATE.fullmatch(text):
            parsed = pd.to_datetime(
                text,
                format="%Y%m%d",
                errors="raise",
                utc=True,
            )
        else:
            parsed = pd.to_datetime(
                text,
                format="mixed",
                errors="raise",
                utc=True,
            )
    except (TypeError, ValueError, OverflowError):
        return None

    return parsed.date()


def _as_bool(value: Any) -> bool:
    """Normalize booleans that may have round-tripped through CSV."""
    if isinstance(value, bool):
        return value

    if value is None or pd.isna(value):
        return False

    return str(value).strip().lower() in {
        "true",
        "1",
        "yes",
        "y",
        "t",
    }


def _finite_positive(value: Any) -> bool:
    if value is None or pd.isna(value):
        return False

    try:
        number = float(value)
    except (TypeError, ValueError):
        return False

    return math.isfinite(number) and number > 0


def _finite_number(value: Any) -> float | None:
    if value is None or pd.isna(value):
        return None

    try:
        number = float(value)
    except (TypeError, ValueError):
        return None

    return number if math.isfinite(number) else None


def validate_transactions(frame: pd.DataFrame) -> pd.DataFrame:
    """Validate each normalized transaction and return quality records."""
    rows: list[dict[str, Any]] = []

    for row in frame.to_dict("records"):
        errors: list[str] = []
        warnings: list[str] = []

        code = str(row.get("transaction_code", "") or "").strip()
        acquired_disposed = str(
            row.get("acquired_disposed_code", "") or ""
        ).strip()

        if code and code not in KNOWN_CODES:
            warnings.append("unknown_transaction_code")

        if (
            acquired_disposed
            and acquired_disposed not in {"A", "D"}
        ):
            errors.append("invalid_acquired_disposed_code")

        transaction_date = _parse_date(
            row.get("transaction_date")
        )
        filing_date = _parse_date(
            row.get("filing_date")
        )

        if transaction_date is None:
            errors.append("invalid_transaction_date")

        if filing_date is None:
            errors.append("invalid_filing_date")

        if (
            transaction_date is not None
            and filing_date is not None
            and transaction_date > filing_date
        ):
            warnings.append("transaction_after_filing")

        is_qualifying_purchase = _as_bool(
            row.get("is_qualifying_purchase")
        )
        is_non_derivative = _as_bool(
            row.get("is_non_derivative")
        )

        if is_qualifying_purchase:
            for field in (
                "shares",
                "price_per_share",
                "reported_value",
            ):
                if not _finite_positive(row.get(field)):
                    errors.append(f"invalid_{field}")

            if not is_non_derivative:
                errors.append("derivative_misclassified")

            if code != "P" or acquired_disposed != "A":
                errors.append("qualifying_rule_mismatch")

        holdings_after = _finite_number(
            row.get("shares_owned_after")
        )

        if holdings_after is not None and holdings_after < 0:
            errors.append("negative_holdings_after")

        if errors:
            quality = "unusable"
        elif warnings:
            quality = "limited"
        else:
            quality = "high"

        total_checks = 8

        rows.append(
            {
                "quality_id": (
                    "transaction:"
                    f"{row.get('transaction_id', '')}"
                ),
                "artifact_name": "transactions",
                "record_id": row.get(
                    "transaction_id",
                    "",
                ),
                "quality": quality,
                "checks_passed": max(
                    total_checks - len(errors) - len(warnings),
                    0,
                ),
                "checks_failed": len(errors),
                "warnings": "|".join(warnings),
                "errors": "|".join(errors),
            }
        )

    return pd.DataFrame(rows)
