import pandas as pd

from pipeline.ingest.prices import _issuer_symbols, ingest_ticker, resolve_yf_ticker


def test_resolve_yf_ticker_rejects_placeholders_and_numeric_identifiers():
    for value in ["", "N/A", "NONE", "NYSE:", "1314152", "@@BAD@@"]:
        assert resolve_yf_ticker(value) == ""


def test_resolve_yf_ticker_handles_parentheses_and_class_shares():
    assert resolve_yf_ticker("(CALX)") == "CALX"
    assert resolve_yf_ticker("BRK.B") == "BRK-B"


def test_issuer_symbols_prefers_yf_ticker_and_deduplicates():
    issuers = pd.DataFrame(
        {
            "primary_ticker": ["BAD", "CALX", "NONE"],
            "yf_ticker": ["BRK-B", "CALX", ""],
        }
    )
    assert _issuer_symbols(issuers) == ["BRK-B", "CALX"]


def test_invalid_symbol_is_skipped_before_downloader_call():
    called = False

    def downloader(*args, **kwargs):
        nonlocal called
        called = True
        return pd.DataFrame()

    result = ingest_ticker("N/A", downloader)
    assert result["status"] == "invalid"
    assert not called


def test_missing_history_is_not_fatal():
    def downloader(*args, **kwargs):
        return pd.DataFrame()

    result = ingest_ticker("RSVB", downloader)
    assert result["status"] == "missing"
