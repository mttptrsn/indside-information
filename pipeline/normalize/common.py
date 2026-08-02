"""Shared normalization helpers."""

from __future__ import annotations
import json, re
from pathlib import Path
from pipeline.utils.hashing import sha256_json

def clean_name(value: str) -> str:
    return re.sub(r"\s+", " ", (value or "").replace(",", " ").strip()).title()

def stable_id(*parts) -> str:
    return sha256_json([str(p) for p in parts])[:24]

def lineage_columns(source_type: str, source_path: str, accession: str, normalized_at: str) -> dict:
    return {
        "source_type": source_type, "source_path": source_path, "source_accession": accession,
        "parser_version": "v1", "normalized_at_utc": normalized_at,
        "source_lineage": json.dumps({
            "source_type": source_type, "source_path": source_path, "source_identifier": accession,
            "source_sha256": "", "parser_version": "v1",
        }, sort_keys=True),
    }
