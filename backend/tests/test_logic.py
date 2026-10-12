"""Pure logic tests: no database needed."""
from datetime import datetime, timedelta, timezone

import pytest

from app.core.thresholds import RULES, VALID_RANGE, classify
from app.services.alert_logic import decide
from app.services.simulation import value_at

T0 = datetime(2026, 10, 12, 12, 0, tzinfo=timezone.utc)


@pytest.mark.parametrize("stype,value,expected", [("aqi", 50, None), ("aqi", 100, "warning"), ("aqi", 250, "critical"),
                                                   ("traffic", 69.9, None), ("traffic", 75, "warning"), ("traffic", 95, "critical"),
                                                   ("temperature", 30, None), ("temperature", 39, "warning"), ("temperature", 43, "critical")])
def test_classify_normal_and_abnormal(stype, value, expected):
    assert classify(stype, value) == expected


def test_energy_thresholds_are_relative_to_zone_baseline():
    assert RULES["energy"].limits(400) == (500.0, 600.0)
    assert classify("energy", 450, 400) is None and classify("energy", 520, 400) == "warning" and classify("energy", 610, 400) == "critical"


def test_decide_creates_only_when_abnormal_and_no_active_alert():
    assert decide(None, None, None, T0, 300).action == "none"
    d = decide("warning", None, None, T0, 300)
    assert (d.action, d.severity) == ("create", "warning")


def test_decide_deduplicates_while_still_abnormal():
    assert decide("warning", "warning", T0, T0 + timedelta(minutes=1), 300).action == "none"
    assert decide("critical", "critical", T0, T0 + timedelta(minutes=1), 300).action == "none"


def test_decide_escalates_and_resolves():
    assert decide("critical", "warning", T0, T0, 300).action == "escalate"
    assert decide(None, "warning", T0, T0, 300).action == "resolve"


def test_decide_cooldown_blocks_quick_repeat_then_allows_later():
    assert decide("warning", None, T0, T0 + timedelta(seconds=100), 300).action == "none"
    assert decide("warning", None, T0, T0 + timedelta(seconds=301), 300).action == "create"


@pytest.mark.parametrize("stype", list(VALID_RANGE))
def test_simulated_values_are_bounded_and_repeatable(stype):
    meta = {"traffic_factor": 1.1, "energy_baseline_kw": 800, "temp_offset_c": 1, "humidity_offset": 4, "aqi_offset": 10}
    lo, hi = VALID_RANGE[stype]
    vals = [value_at("chennai-guindy", meta, stype, T0 + timedelta(minutes=15 * k)) for k in range(192)]
    assert all(lo <= v <= hi for v in vals) and len(set(vals)) > 20
    assert vals == [value_at("chennai-guindy", meta, stype, T0 + timedelta(minutes=15 * k)) for k in range(192)]
