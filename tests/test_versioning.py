import pytest

from pipeline.contracts.versioning import SchemaVersion, validate_schema_version
from pipeline.exceptions import SchemaVersionError


@pytest.mark.parametrize(
    ("raw", "canonical"),
    [("v1", "v1"), ("v1.0", "v1"), ("v2.3", "v2.3")],
)
def test_schema_version_parsing(raw, canonical):
    assert validate_schema_version(raw) == canonical


@pytest.mark.parametrize("raw", ["1", "V1", "v0", "v1.x", "", "v1.2.3"])
def test_invalid_schema_versions(raw):
    with pytest.raises(SchemaVersionError):
        SchemaVersion.parse(raw)


def test_minor_compatibility():
    reader = SchemaVersion.parse("v1.2")
    older_artifact = SchemaVersion.parse("v1.1")
    assert reader.is_compatible_with(older_artifact)
    assert not older_artifact.is_compatible_with(reader)
