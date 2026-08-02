from __future__ import annotations

import numpy as np
import pandas as pd

from pipeline.export.builders import build_search_index


def test_search_index_ignores_numeric_nan_company_metadata():
    companies = pd.DataFrame(
        [
            {
                "issuer_cik": "123",
                "primary_ticker": "TEST",
                "company_name": "Test Company",
                "sector": np.nan,
                "industry": np.nan,
            }
        ]
    )

    payload = build_search_index(
        companies,
        pd.DataFrame(),
    )

    assert payload["items"][0]["label"] == "Test Company"
    assert payload["items"][0]["secondary"] == ""
