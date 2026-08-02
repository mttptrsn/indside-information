"""UTC timestamp helpers."""

from __future__ import annotations

from datetime import datetime, timezone


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def utc_now_iso() -> str:
    return utc_now().isoformat().replace("+00:00", "Z")


def parse_utc_iso(value: str) -> datetime:
    if not isinstance(value, str) or not value.strip():
        raise ValueError("UTC timestamp must be a nonempty string.")
    normalized = value.strip().replace("Z", "+00:00")
    parsed = datetime.fromisoformat(normalized)
    if parsed.tzinfo is None:
        raise ValueError("UTC timestamp must include timezone information.")
    return parsed.astimezone(timezone.utc)
