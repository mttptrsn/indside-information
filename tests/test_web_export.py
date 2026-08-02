from __future__ import annotations

import json
from pathlib import Path

import pandas as pd

from pipeline.export.builders import (
    build_constellation,
    build_overview,
    build_search_index,
)
from pipeline.export.utils import AtomicDirectory, json_safe, slug


def test_json_safe_removes_non_finite_values():
    payload = json_safe(
        {
            "nan": float("nan"),
            "inf": float("inf"),
            "ok": 4.5,
        }
    )
    assert payload == {
        "nan": None,
        "inf": None,
        "ok": 4.5,
    }


def test_slug_is_stable():
    assert slug("BRK.B") == "brk-b"
    assert slug("  Small Signal Corp  ") == "small-signal-corp"


def test_atomic_directory_replaces_complete_tree(tmp_path):
    destination = tmp_path / "data"
    destination.mkdir()
    (destination / "old.json").write_text("{}")

    with AtomicDirectory(destination) as staging:
        (staging / "new.json").write_text('{"ok": true}')

    assert not (destination / "old.json").exists()
    assert json.loads((destination / "new.json").read_text())["ok"] is True


def test_overview_exposes_frontend_counts_and_featured_cards():
    transactions = pd.DataFrame(
        {
            "is_qualifying_purchase": [True, False, True],
            "quality": ["high", "high", "high"],
        }
    )
    events = pd.DataFrame(
        {
            "purchase_value": [100_000, 250_000],
            "quality": ["high", "high"],
        }
    )
    event_signals = pd.DataFrame(
        {
            "issuer_cik": ["1", "2"],
            "behavior_change_score": [90, 70],
            "conviction_score": [92, 60],
            "cluster_score": [30, 0],
            "quality": ["high", "high"],
        }
    )
    company_signals = pd.DataFrame({"issuer_cik": ["1", "2"]})
    companies = pd.DataFrame(
        {
            "issuer_cik": ["1", "2"],
            "discovery_eligible": [True, False],
            "quality": ["high", "acceptable"],
        }
    )
    under = pd.DataFrame(
        {
            "rank": [1],
            "ticker": ["SGNL"],
            "issuer_cik": ["1"],
            "company_name": ["Small Signal"],
            "headline": ["CEO purchase was 10× larger than prior median"],
            "conviction_score": [92],
        }
    )

    payload = build_overview(
        transactions,
        events,
        event_signals,
        company_signals,
        {"under_the_radar": under},
        companies,
        generated_at_utc="2026-08-01T00:00:00Z",
        as_of_date="2026-07-31",
        freshness={},
    )

    assert payload["counts"]["qualifying_purchases"] == 2
    assert payload["counts"]["exceptional_signals"] == 1
    assert payload["featured_discoveries"][0]["ticker"] == "SGNL"


def test_search_index_contains_companies_and_insiders():
    companies = pd.DataFrame(
        {
            "issuer_cik": ["1"],
            "primary_ticker": ["SGNL"],
            "company_name": ["Small Signal"],
            "sector": ["Technology"],
            "industry": ["Software"],
        }
    )
    insiders = pd.DataFrame(
        {
            "insider_id": ["2"],
            "owner_cik": ["2"],
            "display_name": ["Jane Doe"],
            "raw_officer_title": ["Founder and CEO"],
            "normalized_roles": ["founder|ceo"],
        }
    )

    payload = build_search_index(companies, insiders)
    assert len(payload["items"]) == 2
    assert {item["type"] for item in payload["items"]} == {
        "company",
        "insider",
    }


def test_constellation_positions_are_deterministic():
    companies = pd.DataFrame(
        {
            "issuer_cik": ["1"],
            "primary_ticker": ["SGNL"],
            "company_name": ["Small Signal"],
            "sector": ["Technology"],
            "market_cap": [500_000_000],
            "discovery_eligible": [True],
        }
    )
    signals = pd.DataFrame(
        {
            "issuer_cik": ["1"],
            "as_of_date": ["2026-07-31"],
            "conviction_score": [90],
            "behavior_change_score": [95],
        }
    )

    first = build_constellation(
        companies,
        signals,
        pd.DataFrame(),
        generated_at_utc="x",
        as_of_date="y",
        freshness={},
    )
    second = build_constellation(
        companies,
        signals,
        pd.DataFrame(),
        generated_at_utc="x",
        as_of_date="y",
        freshness={},
    )
    assert first["nodes"] == second["nodes"]
