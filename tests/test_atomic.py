import gzip
import json

import pandas as pd
import pytest

from pipeline.exceptions import ArtifactIOError
from pipeline.utils.atomic import (
    atomic_write_bytes,
    atomic_write_csv_gz,
    atomic_write_json,
    atomic_write_text,
)
from pipeline.utils.hashing import sha256_file


def test_atomic_text_and_bytes(tmp_path):
    text_path = tmp_path / "nested" / "sample.txt"
    atomic_write_text(text_path, "alpha\n")
    assert text_path.read_text() == "alpha\n"

    bytes_path = tmp_path / "sample.bin"
    atomic_write_bytes(bytes_path, b"\x00\x01")
    assert bytes_path.read_bytes() == b"\x00\x01"


def test_atomic_json_is_deterministic(tmp_path):
    first = tmp_path / "first.json"
    second = tmp_path / "second.json"
    value = {"b": 2, "a": [1, 2, 3]}
    atomic_write_json(first, value)
    atomic_write_json(second, value)
    assert json.loads(first.read_text()) == value
    assert sha256_file(first) == sha256_file(second)


def test_atomic_csv_gz_is_deterministic(tmp_path):
    frame = pd.DataFrame({"ticker": ["ABC", "XYZ"], "value": [1, 2]})
    first = tmp_path / "first.csv.gz"
    second = tmp_path / "second.csv.gz"
    atomic_write_csv_gz(first, frame)
    atomic_write_csv_gz(second, frame)
    assert sha256_file(first) == sha256_file(second)
    with gzip.open(first, "rt", encoding="utf-8") as handle:
        assert "ticker,value" in handle.read()


def test_failed_writer_preserves_existing_file(tmp_path, monkeypatch):
    target = tmp_path / "target.txt"
    target.write_text("original")

    import pipeline.utils.atomic as atomic_module

    def broken_replace(_src, _dst):
        raise OSError("simulated failure")

    monkeypatch.setattr(atomic_module.os, "replace", broken_replace)
    with pytest.raises(ArtifactIOError):
        atomic_write_text(target, "replacement")
    assert target.read_text() == "original"
    assert not list(tmp_path.glob(".*.tmp"))
