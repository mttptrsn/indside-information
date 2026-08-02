"""Atomic artifact writers."""

from __future__ import annotations

import gzip
import json
import os
import tempfile
from pathlib import Path
from typing import Any

import pandas as pd

from pipeline.exceptions import ArtifactIOError


def _replace(path: Path, payload_writer) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    file_descriptor: int | None = None
    temporary_path: Path | None = None
    try:
        file_descriptor, raw_path = tempfile.mkstemp(
            prefix=f".{path.name}.",
            suffix=".tmp",
            dir=path.parent,
        )
        temporary_path = Path(raw_path)
        with os.fdopen(file_descriptor, "wb") as handle:
            file_descriptor = None
            payload_writer(handle)
            handle.flush()
            os.fsync(handle.fileno())
        os.replace(temporary_path, path)
        temporary_path = None
    except Exception as exc:
        raise ArtifactIOError(f"Atomic write failed for {path}: {exc}") from exc
    finally:
        if file_descriptor is not None:
            os.close(file_descriptor)
        if temporary_path is not None:
            temporary_path.unlink(missing_ok=True)


def atomic_write_bytes(path: str | Path, data: bytes) -> None:
    destination = Path(path)
    _replace(destination, lambda handle: handle.write(data))


def atomic_write_text(path: str | Path, text: str, encoding: str = "utf-8") -> None:
    atomic_write_bytes(path, text.encode(encoding))


def atomic_write_json(
    path: str | Path,
    value: Any,
    *,
    indent: int = 2,
    sort_keys: bool = True,
) -> None:
    payload = (
        json.dumps(
            value,
            indent=indent,
            sort_keys=sort_keys,
            ensure_ascii=False,
            allow_nan=False,
        )
        + "\n"
    )
    atomic_write_text(path, payload)


def atomic_write_csv_gz(
    path: str | Path,
    dataframe: pd.DataFrame,
    *,
    index: bool = False,
) -> None:
    destination = Path(path)

    def writer(handle) -> None:
        with gzip.GzipFile(fileobj=handle, mode="wb", mtime=0) as compressed:
            csv_bytes = dataframe.to_csv(index=index, lineterminator="\n").encode("utf-8")
            compressed.write(csv_bytes)

    _replace(destination, writer)
