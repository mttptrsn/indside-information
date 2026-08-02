"""Download and cache immutable SEC ownership XML documents."""

from __future__ import annotations

import json, re
from pathlib import Path
import pandas as pd

from pipeline.ingest.sec_common import SEC_BASE, SecClient, raw_sec_root, response_metadata
from pipeline.utils.atomic import atomic_write_bytes, atomic_write_json
from pipeline.utils.hashing import sha256_bytes
from pipeline.utils.time import utc_now_iso

_XML_BLOCK = re.compile(r"<XML>(.*?)</XML>", re.IGNORECASE | re.DOTALL)


def extract_ownership_xml(submission_text: str) -> bytes:
    candidates = _XML_BLOCK.findall(submission_text)
    for candidate in candidates:
        if "<ownershipDocument" in candidate or ":ownershipDocument" in candidate:
            return candidate.strip().encode("utf-8")
    if "<ownershipDocument" in submission_text:
        start = submission_text.find("<?xml")
        if start < 0:
            start = submission_text.find("<ownershipDocument")
        end = submission_text.rfind("</ownershipDocument>")
        if end >= 0:
            return submission_text[start:end + len("</ownershipDocument>")].encode("utf-8")
    raise ValueError("No ownershipDocument XML found in submission")


def filing_directory(issuer_cik: str, accession_number: str) -> Path:
    return raw_sec_root() / "filings" / issuer_cik.zfill(10) / accession_number


def download_filing(row: dict, client: SecClient | None = None) -> dict:
    client = client or SecClient()
    issuer_cik = str(row["issuer_cik"]).zfill(10)
    accession = str(row["accession_number"])
    target = filing_directory(issuer_cik, accession)
    xml_path = target / "filing.xml"
    metadata_path = target / "metadata.json"
    if xml_path.exists() and metadata_path.exists():
        return {"accession_number": accession, "status": "cached", "path": str(xml_path)}
    target.mkdir(parents=True, exist_ok=True)
    url = f"{SEC_BASE}/Archives/{str(row['filing_path']).lstrip('/')}"
    response = client.get(url)
    xml = extract_ownership_xml(response.text)
    if xml_path.exists() and xml_path.read_bytes() != xml:
        raise FileExistsError(f"Immutable raw filing differs from cached content: {xml_path}")
    atomic_write_bytes(xml_path, xml)
    metadata = {
        "accession_number": accession, "issuer_cik": issuer_cik, "form_type": row.get("form_type", ""),
        "filing_date": row.get("filing_date", ""), "accepted_at": row.get("accepted_at", ""),
        "source_url": url, "downloaded_at_utc": utc_now_iso(), "content_sha256": sha256_bytes(xml),
        "parser_version": "v1",
    }
    atomic_write_json(metadata_path, metadata)
    atomic_write_json(target / "request.json", response_metadata(url, response.content, response.status_code))
    return {"accession_number": accession, "status": "downloaded", "path": str(xml_path)}


def download_filings(index: pd.DataFrame, client: SecClient | None = None) -> dict[str, int]:
    counts = {"downloaded": 0, "cached": 0, "failed": 0}
    failures = []
    for row in index.to_dict("records"):
        try:
            result = download_filing(row, client)
            counts[result["status"]] += 1
        except Exception as exc:
            counts["failed"] += 1
            failures.append({"accession_number": row.get("accession_number",""), "error": str(exc)})
    if failures:
        atomic_write_json(raw_sec_root() / "filings" / "failures.json", {"generated_at_utc": utc_now_iso(), "failures": failures})
    return counts
