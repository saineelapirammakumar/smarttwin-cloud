"""Alert thresholds and valid reading ranges. Edit the numbers below to change when alerts fire."""
from dataclasses import dataclass


@dataclass(frozen=True)
class Rule:
    sensor_type: str
    alert_type: str
    label: str
    unit: str
    warning: float
    critical: float
    relative_to_baseline: bool = False  # energy limits are multiples of the zone's baseline kW

    def limits(self, baseline: float | None = None) -> tuple[float, float]:
        k = baseline if (self.relative_to_baseline and baseline) else 1.0
        return round(self.warning * k, 2), round(self.critical * k, 2)


RULES = {r.sensor_type: r for r in (
    Rule("traffic", "high_congestion", "Traffic congestion", "%", 70, 90),
    Rule("aqi", "high_aqi", "Air quality index", "AQI", 100, 200),
    Rule("temperature", "high_temperature", "Temperature", "°C", 38, 42),
    Rule("humidity", "high_humidity", "Humidity", "%", 85, 95),
    Rule("energy", "high_energy", "Energy consumption", "kW", 1.25, 1.5, relative_to_baseline=True),
)}
# Readings outside these bounds are rejected (HTTP 422).
VALID_RANGE = {"traffic": (0, 100), "aqi": (0, 500), "temperature": (-10, 60), "humidity": (0, 100), "energy": (0, 1_000_000)}
SENSOR_TYPES = tuple(RULES)
SENSOR_CODES = {"traffic": "TRAFFIC", "aqi": "AQI", "temperature": "TEMP", "humidity": "HUMIDITY", "energy": "ENERGY"}
SENSOR_LABELS = {"traffic": "Traffic Congestion", "aqi": "Air Quality (AQI)", "temperature": "Temperature", "humidity": "Humidity", "energy": "Energy Consumption"}


def classify(sensor_type: str, value: float, baseline: float | None = None) -> str | None:
    """Returns 'critical', 'warning' or None (normal)."""
    warn, crit = RULES[sensor_type].limits(baseline)
    return "critical" if value >= crit else "warning" if value >= warn else None
