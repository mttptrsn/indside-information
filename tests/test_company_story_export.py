from __future__ import annotations

import pandas as pd
import pytest

from pipeline.export.company_story import build_company_story


def test_company_story_builds_price_path_and_purchase_markers():
    dates = pd.date_range(
        "2025-01-01",
        periods=300,
        freq="B",
        tz="UTC",
    )
    prices = pd.DataFrame(
        {
            "date": dates.strftime("%Y-%m-%d"),
            "close": [10 + index * 0.02 for index in range(len(dates))],
            "adj_close": [10 + index * 0.02 for index in range(len(dates))],
            "volume": [100_000] * len(dates),
        }
    )
    events = pd.DataFrame(
        [
            {
                "event_id": "event-1",
                "transaction_date": "2025-03-03",
                "owner_cik": "1",
                "owner_name": "Buyer One",
                "purchase_value": 100_000,
                "purchase_shares": 10_000,
                "weighted_average_price": 10,
            },
            {
                "event_id": "event-2",
                "transaction_date": "2025-06-02",
                "owner_cik": "2",
                "owner_name": "Buyer Two",
                "purchase_value": 220_000,
                "purchase_shares": 20_000,
                "weighted_average_price": 11,
            },
        ]
    )
    signals = pd.DataFrame(
        [
            {
                "event_id": "event-1",
                "conviction_score": 72,
                "behavior_change_score": 68,
            },
            {
                "event_id": "event-2",
                "conviction_score": 86,
                "behavior_change_score": 81,
            },
        ]
    )

    story = build_company_story(
        {
            "issuer_cik": "123",
            "primary_ticker": "TEST",
            "company_name": "Test Company",
        },
        prices,
        events,
        signals,
        generated_at_utc="2026-08-01T00:00:00Z",
        as_of_date="2026-07-31",
        freshness={},
    )

    assert story["price_available"] is True
    assert len(story["price_path"]) <= 260
    assert len(story["purchase_markers"]) == 2
    assert story["summary"]["buyers"] == 2
    assert story["summary"]["purchase_days"] == 2
    assert story["summary"]["total_reported_purchase_value"] == 320000
    assert story["summary"]["average_reported_purchase_price"] == pytest.approx(
        10.666667,
        abs=1e-6,
    )


def test_company_story_handles_missing_prices():
    story = build_company_story(
        {
            "issuer_cik": "123",
            "primary_ticker": "TEST",
        },
        pd.DataFrame(),
        pd.DataFrame(),
        pd.DataFrame(),
        generated_at_utc="2026-08-01T00:00:00Z",
        as_of_date="2026-07-31",
        freshness={},
    )

    assert story["price_available"] is False
    assert story["price_path"] == []
    assert story["purchase_markers"] == []
