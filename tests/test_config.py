from copy import deepcopy

import pytest

from pipeline.contracts.validation import (
    load_all_configs,
    validate_all_contracts,
    validate_pipeline_config,
    validate_scoring_config,
)
from pipeline.exceptions import ConfigurationError


def test_all_packaged_configs_validate():
    summary = validate_all_contracts()
    assert summary["configuration_files"] == 5
    assert summary["artifact_schemas"] == 15
    assert summary["record_types"] == 15


def test_sec_request_rate_must_remain_below_ten():
    config = load_all_configs()["pipeline.json"]
    invalid = deepcopy(config)
    invalid["sec"]["request_rate_per_second"] = 10
    with pytest.raises(ConfigurationError):
        validate_pipeline_config(invalid)


def test_behavior_weights_must_sum_to_one():
    config = load_all_configs()["scoring.json"]
    invalid = deepcopy(config)
    invalid["behavior_change_weights"]["silence_break"] = 0.21
    with pytest.raises(ConfigurationError):
        validate_scoring_config(invalid)
