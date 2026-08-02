"""Normalize raw officer titles into simultaneous role flags."""

from __future__ import annotations
import re
from pipeline.contracts.validation import config_dir, load_json


def normalize_roles(raw_title: str, relationship: dict | None = None) -> list[str]:
    relationship = relationship or {}
    text = re.sub(r"\s+", " ", (raw_title or "").strip().lower())
    roles_cfg = load_json(config_dir() / "role_aliases.json")["roles"]
    roles: set[str] = set()
    for spec in roles_cfg.values():
        for alias in spec["aliases"]:
            alias_text = alias.lower()
            if alias_text == "president" and re.search(r"\bvice president\b", text):
                continue
            pattern = r"(?<![a-z0-9])" + re.escape(alias_text) + r"(?![a-z0-9])"
            if re.search(pattern, text):
                roles.update(spec["normalized_roles"])
                break
    if relationship.get("is_director"):
        roles.add("director")
    if relationship.get("is_ten_percent_owner"):
        roles.add("ten_percent_owner")
    if relationship.get("is_officer") and not roles.intersection({"ceo","cfo","coo","president","operating_executive"}):
        roles.add("other_officer")
    if "founder" in text or "co-founder" in text or "cofounder" in text:
        roles.add("founder")
    return sorted(roles)
