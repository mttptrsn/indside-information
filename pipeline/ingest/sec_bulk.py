"""SEC quarterly Form 3/4/5 bulk archive ingestion."""

from __future__ import annotations

import io
import json
import re
import shutil
import zipfile
from dataclasses import dataclass
from pathlib import Path
from urllib.parse import urljoin

import pandas as pd

from pipeline.ingest.sec_common import SEC_BASE, SecClient, raw_sec_root
from pipeline.utils.atomic import atomic_write_bytes, atomic_write_csv_gz
from pipeline.utils.hashing import sha256_bytes
from pipeline.utils.time import utc_now_iso

DATASET_PAGE_URL = (
    "https://www.sec.gov/data-research/sec-markets-data/"
    "insider-transactions-data-sets"
)

_ARCHIVE_LINK_RE = re.compile(
    r"href=[\"'](?P<href>[^\"']*/(?P<year>20\d{2})q(?P<quarter>[1-4])_form345\.zip)[\"']",
    re.IGNORECASE,
)


@dataclass(frozen=True, order=True)
class BulkArchive:
    """One published SEC quarterly insider-transactions archive."""

    year: int
    quarter: int
    url: str

    @property
    def label(self) -> str:
        return f"{self.year}q{self.quarter}"


def archive_url(year: int, quarter: int) -> str:
    """Return the current SEC structured-data archive URL."""
    if year < 2006:
        raise ValueError("SEC insider transaction bulk data begins in 2006.")
    if quarter not in {1, 2, 3, 4}:
        raise ValueError("quarter must be between 1 and 4.")
    return (
        "https://www.sec.gov/files/structureddata/data/"
        f"insider-transactions-data-sets/{year}q{quarter}_form345.zip"
    )


def parse_archive_links(html: str) -> list[BulkArchive]:
    """Parse the SEC download page instead of guessing unpublished quarters."""
    archives: dict[tuple[int, int], BulkArchive] = {}
    for match in _ARCHIVE_LINK_RE.finditer(html):
        year = int(match.group("year"))
        quarter = int(match.group("quarter"))
        href = match.group("href")
        archives[(year, quarter)] = BulkArchive(
            year=year,
            quarter=quarter,
            url=urljoin(SEC_BASE, href),
        )
    return sorted(archives.values())


def discover_archives(
    start_year: int,
    client: SecClient | None = None,
) -> list[BulkArchive]:
    """Discover only archives that the SEC currently publishes."""
    if start_year < 2006:
        raise ValueError("start_year cannot be earlier than 2006.")

    client = client or SecClient()
    response = client.get(DATASET_PAGE_URL)
    archives = [
        archive
        for archive in parse_archive_links(response.text)
        if archive.year >= start_year
    ]
    if not archives:
        raise RuntimeError(
            f"No published SEC insider transaction archives found from {start_year} onward."
        )
    return archives


def _row_counts(folder: Path) -> dict[str, int]:
    counts: dict[str, int] = {}
    for source in sorted(folder.rglob("*.txt")):
        try:
            with source.open("r", encoding="utf-8", errors="replace") as handle:
                counts[source.name] = max(sum(1 for _ in handle) - 1, 0)
        except OSError:
            counts[source.name] = -1
    return counts


def _extract_archive(payload: bytes, destination: Path) -> None:
    with zipfile.ZipFile(io.BytesIO(payload)) as archive:
        failed_member = archive.testzip()
        if failed_member is not None:
            raise ValueError(f"ZIP integrity check failed for member {failed_member!r}.")

        temporary = destination.with_name(f".{destination.name}.tmp")
        if temporary.exists():
            shutil.rmtree(temporary)
        temporary.mkdir(parents=True)

        try:
            archive.extractall(temporary)
            if destination.exists():
                shutil.rmtree(destination)
            temporary.replace(destination)
        except Exception:
            shutil.rmtree(temporary, ignore_errors=True)
            raise


def ingest_bulk(
    start_year: int,
    client: SecClient | None = None,
) -> dict[str, int]:
    """Download, verify, extract, and inventory published quarterly archives."""
    client = client or SecClient()
    base = raw_sec_root() / "bulk"
    archives_root = base / "archives"
    extracted_root = base / "extracted"
    archives_root.mkdir(parents=True, exist_ok=True)
    extracted_root.mkdir(parents=True, exist_ok=True)

    published = discover_archives(start_year, client)
    manifest_rows: list[dict[str, object]] = []
    downloaded = 0
    cached = 0
    failed = 0

    for archive in published:
        archive_path = archives_root / f"{archive.label}_form345.zip"
        extract_path = extracted_root / archive.label

        try:
            if archive_path.exists() and extract_path.exists():
                payload = archive_path.read_bytes()
                with zipfile.ZipFile(io.BytesIO(payload)) as cached_zip:
                    failed_member = cached_zip.testzip()
                    if failed_member is not None:
                        raise ValueError(
                            f"Cached ZIP integrity check failed for {failed_member!r}."
                        )
                status = "cached"
                cached += 1
            else:
                response = client.get(archive.url)
                payload = response.content
                _extract_archive(payload, extract_path)
                atomic_write_bytes(archive_path, payload)
                status = "downloaded"
                downloaded += 1

            manifest_rows.append(
                {
                    "quarter": archive.label,
                    "source_url": archive.url,
                    "downloaded_at_utc": utc_now_iso(),
                    "content_sha256": sha256_bytes(payload),
                    "archive_size_bytes": len(payload),
                    "status": status,
                    "row_counts_json": json.dumps(
                        _row_counts(extract_path),
                        sort_keys=True,
                    ),
                    "error": "",
                }
            )
        except Exception as exc:
            failed += 1
            manifest_rows.append(
                {
                    "quarter": archive.label,
                    "source_url": archive.url,
                    "downloaded_at_utc": utc_now_iso(),
                    "content_sha256": "",
                    "archive_size_bytes": 0,
                    "status": "failed",
                    "row_counts_json": "{}",
                    "error": str(exc),
                }
            )

    manifest = pd.DataFrame(manifest_rows).sort_values("quarter").reset_index(drop=True)
    atomic_write_csv_gz(base / "download_manifest.csv.gz", manifest)

    return {
        "downloaded": downloaded,
        "cached": cached,
        "failed": failed,
        "quarters": len(published),
    }
