"""JSON and CSV.GZ artifact I/O."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

import pandas as pd

from pipeline.exceptions import ArtifactIOError
from pipeline.utils.atomic import atomic_write_csv_gz, atomic_write_json


def read_json(path: str | Path) -> Any:
    source = Path(path)
    try:
        with source.open("r", encoding="utf-8") as handle:
            return json.load(handle)
    except (OSError, json.JSONDecodeError) as exc:
        raise ArtifactIOError(f"Could not read JSON artifact {source}: {exc}") from exc


def write_json(path: str | Path, value: Any) -> None:
    atomic_write_json(path, value)


def read_csv_gz(path: str | Path, **kwargs: Any) -> pd.DataFrame:
    source = Path(path)
    try:
        return pd.read_csv(source, compression="gzip", **kwargs)
    except Exception as exc:
        raise ArtifactIOError(f"Could not read CSV.GZ artifact {source}: {exc}") from exc


def write_csv_gz(path: str | Path, dataframe: pd.DataFrame) -> None:
    atomic_write_csv_gz(path, dataframe)
