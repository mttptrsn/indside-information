"""Tolerant parser for SEC ownershipDocument XML."""

from __future__ import annotations

from dataclasses import dataclass, field
from pathlib import Path
import xml.etree.ElementTree as ET
from typing import Any


def _local(tag: str) -> str:
    return tag.rsplit("}", 1)[-1].split(":")[-1]


def _child(node: ET.Element | None, name: str) -> ET.Element | None:
    if node is None:
        return None
    for item in list(node):
        if _local(item.tag) == name:
            return item
    return None


def _desc(node: ET.Element | None, path: str) -> ET.Element | None:
    current = node
    for name in path.split("/"):
        current = _child(current, name)
        if current is None:
            return None
    return current


def _text(node: ET.Element | None, path: str, default: str = "") -> str:
    item = _desc(node, path)
    if item is None:
        return default
    value = _child(item, "value")
    target = value if value is not None else item
    return (target.text or default).strip()


def _bool(value: str) -> bool:
    return value.strip().lower() in {"1", "true", "yes"}


def _float(value: str) -> float | None:
    try:
        return float(value.replace(",", "")) if value else None
    except ValueError:
        return None


def _refs(node: ET.Element | None) -> list[str]:
    if node is None:
        return []
    return [item.attrib.get("id","") for item in node.iter() if _local(item.tag) == "footnoteId" and item.attrib.get("id")]


@dataclass
class ParsedOwnership:
    filing: dict[str, Any] = field(default_factory=dict)
    issuer: dict[str, Any] = field(default_factory=dict)
    owners: list[dict[str, Any]] = field(default_factory=list)
    non_derivative_transactions: list[dict[str, Any]] = field(default_factory=list)
    derivative_transactions: list[dict[str, Any]] = field(default_factory=list)
    footnotes: list[dict[str, str]] = field(default_factory=list)
    quality_flags: list[str] = field(default_factory=list)


def parse_ownership_xml(xml: bytes | str, metadata: dict[str, Any] | None = None) -> ParsedOwnership:
    metadata = metadata or {}
    result = ParsedOwnership()
    try:
        root = ET.fromstring(xml)
    except ET.ParseError as exc:
        result.quality_flags.append(f"malformed_xml:{exc}")
        return result
    result.filing = {
        "accession_number": metadata.get("accession_number",""),
        "document_type": _text(root, "documentType"),
        "period_of_report": _text(root, "periodOfReport"),
        "filing_date": metadata.get("filing_date",""),
        "accepted_at": metadata.get("accepted_at",""),
        "is_amendment": _text(root, "documentType") == "4/A",
        "amendment_description": _text(root, "remarks"),
    }
    issuer = _child(root, "issuer")
    result.issuer = {
        "issuer_cik": _text(issuer, "issuerCik").zfill(10),
        "issuer_name": _text(issuer, "issuerName"),
        "ticker": _text(issuer, "issuerTradingSymbol"),
    }
    for owner_node in [n for n in root.iter() if _local(n.tag) == "reportingOwner"]:
        owner_id = _child(owner_node, "reportingOwnerId")
        rel = _child(owner_node, "reportingOwnerRelationship")
        result.owners.append({
            "owner_cik": _text(owner_id, "rptOwnerCik").zfill(10),
            "owner_name": _text(owner_id, "rptOwnerName"),
            "is_director": _bool(_text(rel, "isDirector")),
            "is_officer": _bool(_text(rel, "isOfficer")),
            "is_ten_percent_owner": _bool(_text(rel, "isTenPercentOwner")),
            "is_other": _bool(_text(rel, "isOther")),
            "officer_title": _text(rel, "officerTitle"),
            "other_text": _text(rel, "otherText"),
        })
    for table_name, key, derivative in [
        ("nonDerivativeTable", "nonDerivativeTransaction", False),
        ("derivativeTable", "derivativeTransaction", True),
    ]:
        table = _child(root, table_name)
        if table is None:
            continue
        for seq, tx in enumerate([n for n in list(table) if _local(n.tag) == key], start=1):
            coding = _child(tx, "transactionCoding")
            amounts = _child(tx, "transactionAmounts")
            post = _child(tx, "postTransactionAmounts")
            ownership = _child(tx, "ownershipNature")
            common = {
                "sequence": seq,
                "security_title": _text(tx, "securityTitle"),
                "transaction_date": _text(tx, "transactionDate"),
                "deemed_execution_date": _text(tx, "deemedExecutionDate"),
                "transaction_code": _text(coding, "transactionCode"),
                "transaction_form_type": _text(coding, "transactionFormType"),
                "equity_swap_involved": _bool(_text(coding, "equitySwapInvolved")),
                "shares": _float(_text(amounts, "transactionShares")),
                "price_per_share": _float(_text(amounts, "transactionPricePerShare")),
                "acquired_disposed_code": _text(amounts, "transactionAcquiredDisposedCode"),
                "shares_owned_after": _float(_text(post, "sharesOwnedFollowingTransaction")),
                "direct_indirect_code": _text(ownership, "directOrIndirectOwnership"),
                "nature_of_ownership": _text(ownership, "natureOfOwnership"),
                "footnote_refs": sorted(set(_refs(tx))),
            }
            if derivative:
                common.update({
                    "conversion_price": _float(_text(tx, "conversionOrExercisePrice")),
                    "exercise_date": _text(tx, "exerciseDate"),
                    "expiration_date": _text(tx, "expirationDate"),
                    "underlying_security_title": _text(tx, "underlyingSecurity/underlyingSecurityTitle"),
                    "underlying_shares": _float(_text(tx, "underlyingSecurity/underlyingSecurityShares")),
                })
                result.derivative_transactions.append(common)
            else:
                result.non_derivative_transactions.append(common)
    footnotes = _child(root, "footnotes")
    if footnotes is not None:
        for item in list(footnotes):
            if _local(item.tag) == "footnote":
                result.footnotes.append({"id": item.attrib.get("id",""), "text": "".join(item.itertext()).strip()})
    return result


def parse_file(path: Path) -> ParsedOwnership:
    metadata_path = path.with_name("metadata.json")
    import json
    metadata = json.loads(metadata_path.read_text()) if metadata_path.exists() else {}
    return parse_ownership_xml(path.read_bytes(), metadata)
