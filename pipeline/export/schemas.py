"""Public web-export schema declarations."""

from __future__ import annotations

WEB_SCHEMA_VERSION = "v1"
EXPORT_VERSION = "1.1.0"

RANKING_CATEGORIES = (
    "breaking_habits",
    "quiet_buyers",
    "wolf_packs",
    "growing_positions",
    "accelerating",
    "contrarian",
    "under_the_radar",
)

EXPORT_FILES = (
    "manifest.json",
    "overview.json",
    "status.json",
    "methodology.json",
    "discoveries.json",
    "featured.json",
    "search-index.json",
    "sectors.json",
    "activity/daily.json",
    "visualization/constellation.json",
    "visualization/heartbeat.json",
    "visualization/ripples.json",
    "visualization/sector-orbits.json",
)
