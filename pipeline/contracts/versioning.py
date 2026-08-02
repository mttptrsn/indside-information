"""Schema-version parsing and compatibility helpers."""

from __future__ import annotations

import re
from dataclasses import dataclass

from pipeline.exceptions import SchemaVersionError

_VERSION_RE = re.compile(r"^v(?P<major>[1-9]\d*)(?:\.(?P<minor>\d+))?$")


@dataclass(frozen=True, order=True)
class SchemaVersion:
    """A compact version in ``vMAJOR`` or ``vMAJOR.MINOR`` form."""

    major: int
    minor: int = 0

    @classmethod
    def parse(cls, value: str) -> "SchemaVersion":
        if not isinstance(value, str):
            raise SchemaVersionError("Schema version must be a string.")
        match = _VERSION_RE.fullmatch(value.strip())
        if not match:
            raise SchemaVersionError(
                f"Invalid schema version {value!r}; expected v1 or v1.2."
            )
        return cls(
            major=int(match.group("major")),
            minor=int(match.group("minor") or 0),
        )

    def __str__(self) -> str:
        return f"v{self.major}" if self.minor == 0 else f"v{self.major}.{self.minor}"

    def is_compatible_with(self, other: "SchemaVersion") -> bool:
        """Major versions must match; newer minor readers accept older minors."""
        return self.major == other.major and self.minor >= other.minor


def validate_schema_version(value: str) -> str:
    """Validate and return a canonical schema-version string."""
    return str(SchemaVersion.parse(value))
