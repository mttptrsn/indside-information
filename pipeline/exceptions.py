"""Shared exception hierarchy for the Insider pipeline."""


class InsiderError(Exception):
    """Base exception for all project-specific failures."""


class ConfigurationError(InsiderError):
    """Raised when configuration is missing or invalid."""


class ContractValidationError(InsiderError):
    """Raised when an artifact contract or dataclass is invalid."""


class SchemaVersionError(ContractValidationError):
    """Raised when a schema version is malformed or incompatible."""


class ArtifactIOError(InsiderError):
    """Raised when an artifact cannot be read or written safely."""


class StageNotImplementedError(InsiderError):
    """Raised for CLI stages intentionally deferred to a later module."""
