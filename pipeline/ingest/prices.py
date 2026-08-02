"""Incremental yfinance price ingestion with strict symbol validation."""
from __future__ import annotations

import logging
import re
from datetime import date, timedelta
from pathlib import Path
from typing import Callable

import pandas as pd

from pipeline.contracts.validation import config_dir, load_json, project_root
from pipeline.utils.atomic import atomic_write_csv_gz, atomic_write_json
from pipeline.utils.time import utc_now_iso

_INVALID_SYMBOLS = {"", "N/A", "NA", "NONE", "NULL", "NYSE:", "NASDAQ:", "AMEX:"}
_VALID_YF_SYMBOL = re.compile(r"^[A-Z0-9][A-Z0-9-]{0,14}$")


def resolve_yf_ticker(ticker: str) -> str:
    """Normalize an SEC ticker into Yahoo's symbol convention.

    Returns an empty string for malformed placeholders rather than passing them
    to yfinance. Class-share dots become dashes, for example BRK.B -> BRK-B.
    """
    raw = str(ticker or "").strip().upper()
    raw = raw.replace("$", "").replace(" ", "")
    if raw in _INVALID_SYMBOLS:
        return ""
    if raw.startswith("(") and raw.endswith(")"):
        raw = raw[1:-1].strip()
    raw = raw.replace(".", "-").replace("/", "-")
    if raw in _INVALID_SYMBOLS or not _VALID_YF_SYMBOL.fullmatch(raw):
        return ""
    if raw.isdigit():
        return ""
    return raw


def _normalize_download(raw: pd.DataFrame, ticker: str) -> pd.DataFrame:
    if raw is None or raw.empty:
        return pd.DataFrame()
    frame = raw.copy()
    if isinstance(frame.columns, pd.MultiIndex):
        frame.columns = [column[0] for column in frame.columns]
    frame = frame.reset_index()
    frame.columns = [str(column).strip().lower().replace(" ", "_") for column in frame.columns]
    for column in ["open", "high", "low", "close", "adj_close", "volume", "dividends", "stock_splits"]:
        if column not in frame:
            frame[column] = 0.0 if column in {"dividends", "stock_splits"} else pd.NA
    date_column = "date" if "date" in frame else frame.columns[0]
    frame["date"] = pd.to_datetime(frame[date_column], utc=True).dt.strftime("%Y-%m-%d")
    frame["ticker"] = ticker
    frame["source"] = "yfinance"
    frame["fetched_at_utc"] = utc_now_iso()
    return frame[
        ["date", "ticker", "open", "high", "low", "close", "adj_close", "volume", "dividends", "stock_splits", "source", "fetched_at_utc"]
    ].sort_values("date")


def ingest_ticker(ticker: str, downloader: Callable | None = None) -> dict:
    yf_ticker = resolve_yf_ticker(ticker)
    if not yf_ticker:
        return {"ticker": str(ticker), "yf_ticker": "", "status": "invalid", "rows": 0, "error": "invalid_or_placeholder_symbol"}

    if downloader is None:
        import yfinance as yf
        downloader = yf.download

    config = load_json(config_dir() / "pipeline.json")["prices"]
    output_root = project_root() / "data/raw/prices"
    output_root.mkdir(parents=True, exist_ok=True)
    path = output_root / f"{yf_ticker}.csv.gz"
    existing = pd.DataFrame()
    start = config["history_start"]

    if path.exists():
        existing = pd.read_csv(path, compression="gzip")
        if not existing.empty:
            last = pd.to_datetime(existing["date"]).max().date()
            start = (last - timedelta(days=int(config["overlap_days"]))).isoformat()

    logger = logging.getLogger("yfinance")
    previous_level = logger.level
    logger.setLevel(logging.CRITICAL)
    try:
        raw = downloader(
            yf_ticker,
            start=start,
            end=(date.today() + timedelta(days=1)).isoformat(),
            auto_adjust=False,
            actions=True,
            progress=False,
            threads=False,
        )
    finally:
        logger.setLevel(previous_level)

    fresh = _normalize_download(raw, yf_ticker)
    if fresh.empty and existing.empty:
        return {"ticker": str(ticker), "yf_ticker": yf_ticker, "status": "missing", "rows": 0, "error": "no_price_history"}

    merged = (
        pd.concat([existing, fresh], ignore_index=True)
        .drop_duplicates("date", keep="last")
        .sort_values("date")
    )
    atomic_write_csv_gz(path, merged)
    return {
        "ticker": str(ticker),
        "yf_ticker": yf_ticker,
        "status": "updated" if not fresh.empty else "cached",
        "rows": len(merged),
        "error": "",
    }


def _issuer_symbols(issuers: pd.DataFrame) -> list[str]:
    """Prefer normalized Yahoo symbols and reject malformed SEC values."""
    column = "yf_ticker" if "yf_ticker" in issuers.columns else "primary_ticker"
    candidates = [resolve_yf_ticker(value) for value in issuers[column].tolist()]
    return sorted({symbol for symbol in candidates if symbol})


def ingest_prices(ticker: str | None = None, downloader: Callable | None = None) -> dict:
    issuers_path = project_root() / "data/normalized/issuers.csv.gz"
    issuers = pd.read_csv(issuers_path, compression="gzip", dtype=str, keep_default_na=False)
    symbols = [ticker] if ticker else _issuer_symbols(issuers)
    results: list[dict] = []

    for symbol in symbols:
        try:
            results.append(ingest_ticker(symbol, downloader))
        except Exception as exc:
            results.append({"ticker": str(symbol), "yf_ticker": resolve_yf_ticker(symbol), "status": "failed", "rows": 0, "error": str(exc)})

    report_path = project_root() / "data/quality/price_ingestion_results.json"
    atomic_write_json(report_path, {"generated_at_utc": utc_now_iso(), "results": results})
    return {
        "tickers": len(results),
        "updated": sum(result["status"] == "updated" for result in results),
        "cached": sum(result["status"] == "cached" for result in results),
        "missing": sum(result["status"] == "missing" for result in results),
        "invalid": sum(result["status"] == "invalid" for result in results),
        "failed": sum(result["status"] == "failed" for result in results),
    }
