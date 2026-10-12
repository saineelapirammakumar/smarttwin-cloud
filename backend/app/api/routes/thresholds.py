from fastapi import APIRouter

from app.core.thresholds import RULES

router = APIRouter(prefix="/thresholds", tags=["Alerts"])


@router.get("", summary="Alert thresholds used by the backend")
def thresholds():
    return {t: {"alert_type": r.alert_type, "label": r.label, "unit": r.unit, "warning": r.warning, "critical": r.critical,
                "relative_to_baseline": r.relative_to_baseline} for t, r in RULES.items()}
