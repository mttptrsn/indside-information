"""Shared SEC HTTP behavior and project paths."""

from __future__ import annotations

import json, time
from pathlib import Path
from typing import Any
import requests

from pipeline.contracts.validation import config_dir, load_json, project_root
from pipeline.exceptions import ConfigurationError
from pipeline.utils.hashing import sha256_bytes

SEC_BASE = "https://www.sec.gov"


def pipeline_config() -> dict[str, Any]:
    return load_json(config_dir() / "pipeline.json")


def sec_headers() -> dict[str, str]:
    user_agent = str(pipeline_config()["sec"]["user_agent"]).strip()
    if not user_agent or user_agent == "REPLACE_WITH_NAME_AND_EMAIL":
        raise ConfigurationError("Set sec.user_agent in pipeline/config/pipeline.json before SEC network access.")
    return {"User-Agent": user_agent, "Accept-Encoding": "gzip, deflate", "Host": "www.sec.gov"}


class SecClient:
    def __init__(self, session: requests.Session | None = None, sleep=time.sleep):
        cfg = pipeline_config()["sec"]
        self.session = session or requests.Session()
        self.timeout = float(cfg["timeout_seconds"])
        self.retries = int(cfg["retry_attempts"])
        self.delay = 1.0 / float(cfg["request_rate_per_second"])
        self.sleep = sleep
        self._last_request = 0.0

    def get(self, url: str) -> requests.Response:
        for attempt in range(self.retries + 1):
            elapsed = time.monotonic() - self._last_request
            if elapsed < self.delay:
                self.sleep(self.delay - elapsed)
            response = self.session.get(url, headers=sec_headers(), timeout=self.timeout)
            self._last_request = time.monotonic()
            if response.status_code == 200:
                return response
            if response.status_code not in {429, 500, 502, 503, 504} or attempt == self.retries:
                response.raise_for_status()
            self.sleep(min(2 ** attempt, 8))
        raise RuntimeError("unreachable")


def raw_sec_root() -> Path:
    return project_root() / "data/raw/sec"


def response_metadata(url: str, content: bytes, status_code: int = 200) -> dict[str, Any]:
    return {"url": url, "status_code": status_code, "sha256": sha256_bytes(content)}
