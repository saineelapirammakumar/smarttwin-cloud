from app.data.catalog import CITIES

_BY_ID = {c["id"]: c for c in CITIES}


def list_cities() -> list[dict]:
    return CITIES


def get_city(city_id: str) -> dict | None:
    return _BY_ID.get(city_id)
