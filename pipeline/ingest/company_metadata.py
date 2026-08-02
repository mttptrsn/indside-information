"""Cached yfinance issuer metadata."""
from __future__ import annotations
from pipeline.contracts.validation import project_root
from pipeline.ingest.prices import resolve_yf_ticker
from pipeline.utils.atomic import atomic_write_json
from pipeline.utils.time import utc_now_iso

def fetch_company_metadata(ticker:str,ticker_factory=None)->dict:
    if ticker_factory is None:
        import yfinance as yf
        ticker_factory = yf.Ticker
    yft=resolve_yf_ticker(ticker);path=project_root()/'data/raw/company_metadata'/f'{yft}.json'
    if path.exists():
        import json;return json.loads(path.read_text())
    try:info=ticker_factory(yft).get_info() or {}
    except Exception:info={}
    payload={'ticker':yft,'company_name':info.get('longName') or info.get('shortName') or '',
      'market_cap':info.get('marketCap'),'sector':info.get('sector') or '','industry':info.get('industry') or '',
      'exchange':info.get('exchange') or '','quote_type':info.get('quoteType') or '',
      'metadata_fetched_at_utc':utc_now_iso(),'metadata_quality':'high' if info else 'limited'}
    atomic_write_json(path,payload);return payload
