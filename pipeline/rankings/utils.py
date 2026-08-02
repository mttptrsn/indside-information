"""Shared ranking data-frame utilities."""

from __future__ import annotations

from typing import Any

import pandas as pd


def column(
    frame: pd.DataFrame,
    name: str,
    default: Any = "",
) -> pd.Series:
    """Return a column or an index-aligned default Series.

    DataFrame.get(name, scalar_default) returns a scalar when the column is
    absent. Ranking code commonly calls fillna, astype, or string methods on
    the result, so the fallback must remain a Series.
    """
    if name in frame.columns:
        return frame[name]

    return pd.Series(
        default,
        index=frame.index,
        name=name,
    )


def text_column(
    frame: pd.DataFrame,
    name: str,
    default: str = "",
) -> pd.Series:
    return (
        column(frame, name, default)
        .fillna(default)
        .astype(str)
    )


def numeric_column(
    frame: pd.DataFrame,
    name: str,
    default: float = 0.0,
) -> pd.Series:
    return (
        pd.to_numeric(
            column(frame, name, default),
            errors="coerce",
        )
        .fillna(default)
    )


def boolean_column(
    frame: pd.DataFrame,
    name: str,
    default: bool = False,
) -> pd.Series:
    values = column(frame, name, default)

    if pd.api.types.is_bool_dtype(values):
        return values.fillna(default)

    normalized = (
        values.fillna(default)
        .astype(str)
        .str.strip()
        .str.lower()
    )

    return normalized.isin(
        {"true", "1", "yes", "y"}
    )
