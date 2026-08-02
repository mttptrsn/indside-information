"""SEC company ticker-to-CIK reference ingestion."""

from __future__ import annotations
import json
from pipeline.ingest.sec_common import SecClient, raw_sec_root
from pipeline.utils.atomic import atomic_write_bytes

URL = "https://www.sec.gov/files/company_tickers.json"


def ingest_company_tickers(client: SecClient | None = None) -> dict[str, int]:
    client = client or SecClient()
    path = raw_sec_root() / "reference" / "company_tickers.json"
    if path.exists():
        data = json.loads(path.read_text())
        return {"status": "cached", "count": len(data)}
    response = client.get(URL)
    data = response.json()
    atomic_write_bytes(path, response.content)
    return {"status": "downloaded", "count": len(data)}
