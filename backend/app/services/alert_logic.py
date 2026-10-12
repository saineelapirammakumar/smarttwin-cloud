"""Pure alert decision logic (no database): de-duplication, escalation, auto-resolve and cooldown."""
from dataclasses import dataclass
from datetime import datetime


@dataclass
class Decision:
    action: str  # none | create | escalate | resolve
    severity: str | None = None


def decide(severity: str | None, active_severity: str | None, last_activity: datetime | None, ts: datetime, cooldown_seconds: int) -> Decision:
    """severity: what this reading looks like (None = normal). active_severity: severity of the currently
    open/acknowledged alert for this sensor+type (None = no active alert). last_activity: latest time that
    alert type was triggered or resolved for this sensor."""
    if active_severity:
        if severity is None:
            return Decision("resolve")
        if severity == "critical" and active_severity == "warning":
            return Decision("escalate", "critical")
        return Decision("none")  # still abnormal: do NOT create another alert
    if severity is None:
        return Decision("none")
    if last_activity and (ts - last_activity).total_seconds() < cooldown_seconds:
        return Decision("none")  # cooldown after a recent alert
    return Decision("create", severity)
