"""Recent SEC daily-index discovery for Forms 4 and 4/A."""

from __future__ import annotations

from datetime import date, timedelta
from pathlib import Path
import pandas as pd

from pipeline.ingest.sec_common import SecClient, raw_sec_root
from pipeline.utils.atomic import atomic_write_csv_gz
from pipeline.utils.time import utc_now_iso


def master_index_url(day: date) -> str:
    quarter = (day.month - 1) // 3 + 1
    return f"https://www.sec.gov/Archives/edgar/daily-index/{day.year}/QTR{quarter}/master.{day:%Y%m%d}.idx"


def parse_master_index(text: str, filing_date: str) -> pd.DataFrame:
    rows = []
    active = False
    for line in text.splitlines():
        if line.startswith("-----"):
            active = True
            continue
        if not active or "|" not in line:
            continue
        parts = line.split("|")
        if len(parts) != 5:
            continue
        cik, company, form_type, filed, path = [part.strip() for part in parts]
        if form_type not in {"4", "4/A"}:
            continue
        accession = Path(path).stem
        rows.append({
            "filing_date": filed or filing_date, "accepted_at": "", "issuer_cik": cik.zfill(10),
            "company_name": company, "form_type": form_type, "accession_number": accession,
            "filing_path": path, "discovered_at_utc": utc_now_iso(),
        })
    return pd.DataFrame(rows)


def discover_recent(lookback_days: int, client: SecClient | None = None, today: date | None = None) -> pd.DataFrame:
    client = client or SecClient()
    today = today or date.today()
    frames = []
    index_root = raw_sec_root() / "indexes"
    index_root.mkdir(parents=True, exist_ok=True)
    for offset in range(lookback_days):
        day = today - timedelta(days=offset)
        if day.weekday() >= 5:
            continue
        try:
            response = client.get(master_index_url(day))
            frame = parse_master_index(response.text, day.isoformat())
            if not frame.empty:
                atomic_write_csv_gz(index_root / f"{day.isoformat()}.csv.gz", frame)
                frames.append(frame)
        except Exception:
            continue
    if not frames:
        return pd.DataFrame(columns=["filing_date","accepted_at","issuer_cik","company_name","form_type","accession_number","filing_path","discovered_at_utc"])
    return pd.concat(frames, ignore_index=True).drop_duplicates("accession_number").sort_values(["filing_date","accession_number"])
