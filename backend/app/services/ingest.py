"""Stores readings and runs threshold alert logic. Used by the POST endpoint, the simulator and the seed script."""
from dataclasses import dataclass, field
from datetime import datetime

from sqlalchemy import func, insert, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.thresholds import RULES, Rule, classify
from app.models import Alert, Sensor, SensorReading
from app.services.alert_logic import decide

ACTIVE = ("open", "acknowledged")


@dataclass
class NewReading:
    sensor: Sensor
    value: float
    ts: datetime
    source: str = "simulated"
    meta: dict | None = None


@dataclass
class AlertEvent:
    action: str  # created | escalated | resolved
    alert: Alert


@dataclass
class IngestResult:
    count: int = 0
    readings: list = field(default_factory=list)
    events: list = field(default_factory=list)


def alert_message(rule: Rule, zone_name: str, value: float, severity: str, limit: float, source: str) -> str:
    sep = "" if rule.unit in ("%", "°C") else " "
    note = " (Simulated data)" if source == "simulated" else ""
    return f"{rule.label} in {zone_name} is {value:g}{sep}{rule.unit}, above the {severity} limit of {limit:g}{sep}{rule.unit}.{note}"


def ingest(db: Session, items: list[NewReading], *, evaluate_alerts_from: datetime | None = None,
           cooldown_seconds: int | None = None, return_rows: bool = False) -> IngestResult:
    """Insert readings, refresh each sensor's latest value, then evaluate alert rules in time order.
    The caller commits."""
    if not items:
        return IngestResult()
    cooldown = get_settings().alert_cooldown_seconds if cooldown_seconds is None else cooldown_seconds
    items = sorted(items, key=lambda i: i.ts)
    rows = [{"sensor_id": i.sensor.id, "value": i.value, "recorded_at": i.ts, "data_source": i.source, "meta": i.meta} for i in items]
    result = IngestResult(count=len(rows))
    if return_rows:
        result.readings = list(db.scalars(insert(SensorReading).returning(SensorReading), rows))
    else:
        db.execute(insert(SensorReading), rows)
    for i in items:  # items are time-ordered, so the last one per sensor wins
        s = i.sensor
        if s.last_reading_at is None or i.ts >= s.last_reading_at:
            s.last_value, s.last_reading_at = i.value, i.ts

    todo = [i for i in items if evaluate_alerts_from is None or i.ts >= evaluate_alerts_from]
    if not todo:
        return result
    ids = {i.sensor.id for i in todo}
    active = {(a.sensor_id, a.alert_type): a for a in db.scalars(select(Alert).where(Alert.sensor_id.in_(ids), Alert.status.in_(ACTIVE)))}
    last = {(sid, t): ts for sid, t, ts in db.execute(
        select(Alert.sensor_id, Alert.alert_type, func.max(func.coalesce(Alert.resolved_at, Alert.triggered_at)))
        .where(Alert.sensor_id.in_(ids)).group_by(Alert.sensor_id, Alert.alert_type))}
    for i in todo:
        s, zone = i.sensor, i.sensor.zone
        rule, baseline = RULES[s.sensor_type], (zone.meta or {}).get("energy_baseline_kw")
        key = (s.id, rule.alert_type)
        warn, crit = rule.limits(baseline)
        cur = active.get(key)
        d = decide(classify(s.sensor_type, i.value, baseline), cur.severity if cur else None, last.get(key), i.ts, cooldown)
        if d.action == "create":
            limit = crit if d.severity == "critical" else warn
            alert = Alert(sensor_id=s.id, zone_id=zone.id, alert_type=rule.alert_type, severity=d.severity, status="open",
                          value=i.value, threshold=limit, data_source=i.source, triggered_at=i.ts,
                          message=alert_message(rule, zone.name, i.value, d.severity, limit, i.source))
            try:
                with db.begin_nested():  # savepoint: the unique index guards against a concurrent duplicate
                    db.add(alert)
                    db.flush()
            except IntegrityError:
                continue
            active[key], last[key] = alert, i.ts
            result.events.append(AlertEvent("created", alert))
        elif d.action == "escalate":
            cur.severity, cur.value, cur.threshold = "critical", i.value, crit
            cur.message = alert_message(rule, zone.name, i.value, "critical", crit, i.source)
            result.events.append(AlertEvent("escalated", cur))
        elif d.action == "resolve":
            cur.status, cur.resolved_at = "resolved", i.ts
            cur.resolution_note = f"Auto-resolved: reading returned to normal ({i.value:g}{rule.unit})."
            del active[key]
            last[key] = i.ts
            result.events.append(AlertEvent("resolved", cur))
    db.flush()
    return result
