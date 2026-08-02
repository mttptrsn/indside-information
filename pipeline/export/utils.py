"""Utilities for deterministic, compact static JSON exports."""

from __future__ import annotations

import hashlib
import json
import math
import os
import shutil
import tempfile
from datetime import date, datetime
from pathlib import Path
from typing import Any, Iterable

import numpy as np
import pandas as pd

from pipeline.utils.atomic import atomic_write_json
from pipeline.utils.hashing import sha256_file


def json_safe(value: Any) -> Any:
    """Convert pandas, NumPy, and datetime values into strict JSON values."""
    if value is None:
        return None

    if isinstance(value, (datetime, date, pd.Timestamp)):
        if pd.isna(value):
            return None
        return value.isoformat()

    if isinstance(value, (np.integer,)):
        return int(value)

    if isinstance(value, (np.floating, float)):
        number = float(value)
        return number if math.isfinite(number) else None

    if isinstance(value, (np.bool_, bool)):
        return bool(value)

    if isinstance(value, dict):
        return {str(key): json_safe(item) for key, item in value.items()}

    if isinstance(value, (list, tuple, set)):
        return [json_safe(item) for item in value]

    try:
        if pd.isna(value):
            return None
    except (TypeError, ValueError):
        pass

    return value


def records(frame: pd.DataFrame, *, limit: int | None = None) -> list[dict[str, Any]]:
    if frame.empty:
        return []
    selected = frame.head(limit) if limit is not None else frame
    return [json_safe(row) for row in selected.to_dict("records")]


def text_series(frame: pd.DataFrame, name: str, default: str = "") -> pd.Series:
    if name not in frame.columns:
        return pd.Series(default, index=frame.index, dtype="object")
    return frame[name].fillna(default).astype(str)


def numeric_series(frame: pd.DataFrame, name: str, default: float = 0.0) -> pd.Series:
    if name not in frame.columns:
        return pd.Series(default, index=frame.index, dtype="float64")
    return pd.to_numeric(frame[name], errors="coerce").fillna(default)


def boolean_series(frame: pd.DataFrame, name: str, default: bool = False) -> pd.Series:
    if name not in frame.columns:
        return pd.Series(default, index=frame.index, dtype="bool")
    values = frame[name]
    if pd.api.types.is_bool_dtype(values):
        return values.fillna(default)
    return (
        values.fillna(default)
        .astype(str)
        .str.strip()
        .str.lower()
        .isin({"true", "1", "yes", "y", "t"})
    )


def split_tokens(value: Any) -> list[str]:
    if value is None:
        return []
    try:
        if pd.isna(value):
            return []
    except (TypeError, ValueError):
        pass
    if isinstance(value, list):
        return [str(item) for item in value if str(item).strip()]
    text = str(value).strip()
    if not text:
        return []
    if text.startswith("["):
        try:
            decoded = json.loads(text)
            if isinstance(decoded, list):
                return [str(item) for item in decoded if str(item).strip()]
        except json.JSONDecodeError:
            pass
    separator = "|" if "|" in text else ","
    return [item.strip() for item in text.split(separator) if item.strip()]


def slug(value: Any, fallback: str = "unknown") -> str:
    raw = str(value or "").strip().lower()
    cleaned = "".join(character if character.isalnum() else "-" for character in raw)
    cleaned = "-".join(part for part in cleaned.split("-") if part)
    return cleaned or fallback


def deterministic_unit(value: str, salt: str = "") -> float:
    digest = hashlib.sha256(f"{salt}:{value}".encode("utf-8")).digest()
    integer = int.from_bytes(digest[:8], "big")
    return integer / float(2**64 - 1)


def compact_number(value: Any) -> float | int | None:
    safe = json_safe(value)
    if isinstance(safe, float):
        return round(safe, 6)
    return safe


def write_json(path: Path, payload: Any) -> None:
    atomic_write_json(path, json_safe(payload), indent=2, sort_keys=False)


def directory_manifest(root: Path) -> dict[str, dict[str, Any]]:
    result: dict[str, dict[str, Any]] = {}
    for path in sorted(root.rglob("*.json")):
        if path.name == "manifest.json":
            continue
        relative = path.relative_to(root).as_posix()
        result[relative] = {
            "sha256": sha256_file(path),
            "bytes": path.stat().st_size,
        }
    return result


class AtomicDirectory:
    """Publish a complete directory without exposing a partially written export."""

    def __init__(self, destination: Path):
        self.destination = destination
        self.parent = destination.parent
        self.temporary: Path | None = None

    def __enter__(self) -> Path:
        self.parent.mkdir(parents=True, exist_ok=True)
        self.temporary = Path(
            tempfile.mkdtemp(
                prefix=f".{self.destination.name}.",
                suffix=".tmp",
                dir=self.parent,
            )
        )
        return self.temporary

    def __exit__(self, exc_type, exc, traceback) -> bool:
        if self.temporary is None:
            return False

        if exc_type is not None:
            shutil.rmtree(self.temporary, ignore_errors=True)
            return False

        backup = self.destination.with_name(f".{self.destination.name}.backup")
        if backup.exists():
            shutil.rmtree(backup)

        if self.destination.exists():
            os.replace(self.destination, backup)

        try:
            os.replace(self.temporary, self.destination)
            self.temporary = None
            shutil.rmtree(backup, ignore_errors=True)
        except Exception:
            if self.destination.exists():
                shutil.rmtree(self.destination, ignore_errors=True)
            if backup.exists():
                os.replace(backup, self.destination)
            raise

        return False
