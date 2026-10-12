"""API tests against a real PostgreSQL test database (skipped when TEST_DATABASE_URL is not set)."""
from datetime import datetime, timedelta, timezone

AQI, TRAFFIC, ENERGY = "CHENNAI-PERAMBUR-AQI-01", "CHENNAI-PERAMBUR-TRAFFIC-01", "CHENNAI-PERAMBUR-ENERGY-01"


def iso(dt):
    return dt.strftime("%Y-%m-%dT%H:%M:%S.%fZ")


def post(client, sensor, value, at=None, **extra):
    body = {"value": value, **extra}
    if at:
        body["recorded_at"] = iso(at)
    return client.post(f"/api/sensors/{sensor}/readings", json=body)


# ---------- health, cities, zones ----------
def test_health_reports_database_ok(client):
    body = client.get("/health").json()
    assert body["status"] == "ok" and body["database"]["status"] == "ok"


def test_zones_of_each_city(client):
    zones = client.get("/api/cities/chennai/zones").json()
    assert len(zones) == 6 and zones[0]["sensor_count"] == 5 and zones[0]["id"] == "chennai-perambur"
    assert "Gandhipuram" in [z["name"] for z in client.get("/api/cities/coimbatore/zones").json()]
    assert len(client.get("/api/zones").json()) == 72 and len(client.get("/api/zones?city_id=hosur").json()) == 6


def test_unknown_city_zone_sensor_alert_are_404(client):
    for url in ("/api/cities/atlantis/zones", "/api/cities/atlantis/metrics", "/api/zones?city_id=atlantis", "/api/sensors/NOPE",
                "/api/sensors/NOPE/readings", "/api/readings?zone_id=nope", "/api/readings?sensor_id=NOPE", "/api/alerts/999999", "/api/sensors?city_id=atlantis"):
        assert client.get(url).status_code == 404, url
    assert client.patch("/api/alerts/999999", json={"status": "resolved"}).status_code == 404
    assert post(client, "NOPE", 10).status_code == 404


# ---------- sensors ----------
def test_list_sensors_with_filters_and_limits(client):
    assert len(client.get("/api/sensors?limit=1000").json()) == 360
    assert len(client.get("/api/sensors?city_id=chennai").json()) == 30
    assert len(client.get("/api/sensors?zone_id=chennai-perambur").json()) == 5
    assert {s["sensor_type"] for s in client.get("/api/sensors?sensor_type=aqi&limit=1000").json()} == {"aqi"}
    assert len(client.get("/api/sensors?limit=7").json()) == 7
    assert client.get("/api/sensors?limit=0").status_code == 422 and client.get("/api/sensors?status=broken").status_code == 422


def test_get_one_sensor(client):
    s = client.get(f"/api/sensors/{AQI}").json()
    assert s["zone_id"] == "chennai-perambur" and s["sensor_type"] == "aqi" and s["unit"] == "AQI" and s["data_source"] == "simulated"


# ---------- readings: submit ----------
def test_submit_valid_reading_updates_sensor_and_is_labelled(client):
    r = post(client, TRAFFIC, 42.5)
    assert r.status_code == 201
    body = r.json()
    assert body["reading"]["value"] == 42.5 and body["reading"]["data_source"] == "simulated" and body["alert"] is None
    assert client.get(f"/api/sensors/{TRAFFIC}").json()["last_value"] == 42.5


def test_invalid_readings_are_rejected(client):
    assert post(client, TRAFFIC, 150).status_code == 422            # above 100 %
    assert post(client, TRAFFIC, -1).status_code == 422
    assert post(client, "CHENNAI-PERAMBUR-TEMP-01", 99).status_code == 422
    assert client.post(f"/api/sensors/{TRAFFIC}/readings", json={"value": "abc"}).status_code == 422
    assert client.post(f"/api/sensors/{TRAFFIC}/readings", json={}).status_code == 422
    assert client.post(f"/api/sensors/{TRAFFIC}/readings", content='{"value": NaN}', headers={"Content-Type": "application/json"}).status_code == 422
    future = datetime.now(timezone.utc) + timedelta(hours=2)
    assert post(client, TRAFFIC, 10, at=future).status_code == 422
    assert post(client, TRAFFIC, 10, data_source="magic").status_code == 422
    body = client.post(f"/api/sensors/{TRAFFIC}/readings", json={"value": "abc"}).json()
    assert body["detail"].startswith("Invalid input: value") and body["errors"]
    assert client.get("/api/readings?limit=0").status_code == 422


# ---------- readings: history ----------
def test_history_is_chronological_and_filterable(client):
    now = datetime.now(timezone.utc)
    for minutes, v in ((10, 30), (30, 10), (20, 20)):  # posted out of order on purpose
        assert post(client, TRAFFIC, v, at=now - timedelta(minutes=minutes)).status_code == 201
    post(client, AQI, 55, at=now - timedelta(minutes=5))
    rows = client.get(f"/api/sensors/{TRAFFIC}/readings").json()
    assert [r["value"] for r in rows] == [10, 20, 30]
    assert [r["value"] for r in client.get(f"/api/sensors/{TRAFFIC}/readings?limit=2").json()] == [10, 20]
    assert [r["value"] for r in client.get(f"/api/sensors/{TRAFFIC}/readings?limit=2&offset=2").json()] == [30]
    window = client.get(f"/api/readings?sensor_id={TRAFFIC}&start={iso(now - timedelta(minutes=25))}&end={iso(now - timedelta(minutes=15))}").json()
    assert [r["value"] for r in window] == [20]
    assert {r["metric"] for r in client.get("/api/readings?city_id=chennai&metric=aqi").json()} == {"aqi"}
    assert len(client.get("/api/readings?zone_id=chennai-perambur").json()) == 4
    assert client.get("/api/readings?city_id=madurai").json() == []
    assert client.get(f"/api/readings?start={iso(now)}&end={iso(now - timedelta(hours=1))}").status_code == 422


def test_latest_and_timeseries_endpoints(client):
    now = datetime.now(timezone.utc)
    for m, v in ((12, 20), (8, 40), (2, 60)):
        post(client, TRAFFIC, v, at=now - timedelta(minutes=m))
    latest = client.get("/api/readings/latest?city_id=chennai").json()
    assert len(latest) == 1 and latest[0]["value"] == 60 and latest[0]["metric"] == "traffic"
    ts = client.get(f"/api/readings/timeseries?city_id=chennai&start={iso(now - timedelta(hours=1))}&end={iso(now)}&bucket_seconds=300").json()
    series = ts["series"][0]
    assert series["zone_id"] == "chennai-perambur" and series["metric"] == "traffic" and len(series["points"]) == 3
    assert client.get(f"/api/readings/timeseries?start={iso(now - timedelta(days=30))}&end={iso(now)}&bucket_seconds=1").status_code == 422


# ---------- alerts ----------
def test_normal_reading_creates_no_alert(client):
    assert post(client, AQI, 50).json()["alert"] is None
    assert client.get("/api/alerts").json() == []


def test_abnormal_reading_creates_linked_alert(client):
    r = post(client, AQI, 150).json()
    a = r["alert"]
    assert r["alert_action"] == "created" and a["severity"] == "warning" and a["status"] == "open" and a["alert_type"] == "high_aqi"
    assert a["sensor_id"] == AQI and a["zone_id"] == "chennai-perambur" and a["city_id"] == "chennai" and a["threshold"] == 100 and a["data_source"] == "simulated"
    assert "Simulated" in a["message"]
    assert post(client, TRAFFIC, 95).json()["alert"]["severity"] == "critical"


def test_energy_alert_uses_zone_baseline(client):
    baseline = client.get("/api/cities/chennai/zones").json()[0]["meta"]["energy_baseline_kw"]
    assert post(client, ENERGY, round(baseline * 0.9, 1)).json()["alert"] is None
    assert post(client, ENERGY, round(baseline * 1.3, 1)).json()["alert"]["alert_type"] == "high_energy"


def test_repeated_abnormal_readings_do_not_create_duplicate_alerts(client):
    for v in (130, 140, 150, 160):
        post(client, AQI, v)
    alerts = client.get(f"/api/alerts?sensor_id={AQI}").json()
    assert len(alerts) == 1 and alerts[0]["status"] == "open"


def test_alert_escalates_in_place_and_auto_resolves(client):
    post(client, AQI, 150)
    esc = post(client, AQI, 260).json()
    assert esc["alert_action"] == "escalated" and esc["alert"]["severity"] == "critical"
    res = post(client, AQI, 60).json()
    assert res["alert_action"] == "resolved" and res["alert"]["status"] == "resolved" and "Auto-resolved" in res["alert"]["resolution_note"]
    assert len(client.get("/api/alerts").json()) == 1


def test_cooldown_blocks_an_immediate_new_alert(client):
    post(client, AQI, 150), post(client, AQI, 60)           # created then auto-resolved
    assert post(client, AQI, 160).json()["alert"] is None   # still inside the 300 s cooldown
    assert len(client.get("/api/alerts").json()) == 1


def test_new_alert_allowed_after_resolution_when_cooldown_is_zero(client_nocooldown):
    c = client_nocooldown
    post(c, AQI, 150), post(c, AQI, 60)
    assert post(c, AQI, 170).json()["alert_action"] == "created"
    assert len(c.get("/api/alerts").json()) == 2


def test_list_filter_get_alerts(client):
    post(client, AQI, 150), post(client, TRAFFIC, 95), post(client, "HOSUR-SIPCOT-AQI-01", 150)
    assert len(client.get("/api/alerts").json()) == 3
    assert len(client.get("/api/alerts?city_id=chennai").json()) == 2
    assert [a["severity"] for a in client.get("/api/alerts?severity=critical").json()] == ["critical"]
    assert len(client.get("/api/alerts?status=open").json()) == 3 and client.get("/api/alerts?status=resolved").json() == []
    assert len(client.get("/api/alerts?limit=1").json()) == 1
    alert = client.get("/api/alerts?city_id=hosur").json()[0]
    assert client.get(f"/api/alerts/{alert['id']}").json()["zone_name"] == "SIPCOT Industrial Area"
    assert client.get("/api/alerts?severity=huge").status_code == 422 and client.get("/api/alerts?limit=5000").status_code == 422


def test_acknowledge_and_resolve_alert(client):
    aid = post(client, AQI, 150).json()["alert"]["id"]
    ack = client.patch(f"/api/alerts/{aid}", json={"status": "acknowledged"})
    assert ack.status_code == 200 and ack.json()["status"] == "acknowledged" and ack.json()["acknowledged_at"]
    assert client.patch(f"/api/alerts/{aid}", json={"status": "acknowledged"}).status_code == 409
    done = client.patch(f"/api/alerts/{aid}", json={"status": "resolved", "note": "Checked on site"}).json()
    assert done["status"] == "resolved" and done["resolution_note"] == "Checked on site" and done["resolved_at"]
    assert client.patch(f"/api/alerts/{aid}", json={"status": "acknowledged"}).status_code == 409
    assert client.patch(f"/api/alerts/{aid}", json={"status": "open"}).status_code == 422
    assert client.patch(f"/api/alerts/{aid}", json={}).status_code == 422


def test_acknowledged_alert_still_deduplicates(client):
    aid = post(client, AQI, 150).json()["alert"]["id"]
    client.patch(f"/api/alerts/{aid}", json={"status": "acknowledged"})
    assert post(client, AQI, 155).json()["alert"] is None and len(client.get("/api/alerts").json()) == 1


# ---------- dashboard and thresholds ----------
def test_city_dashboard_metrics(client):
    post(client, AQI, 150), post(client, TRAFFIC, 40)
    m = client.get("/api/cities/chennai/metrics").json()
    assert m["city"]["id"] == "chennai" and m["data_source"] == "simulated" and len(m["zones"]) == 6
    assert m["metrics"]["aqi"]["value"] == 150 and m["metrics"]["aqi"]["status"] == "warning" and m["metrics"]["traffic"]["value"] == 40
    assert m["metrics"]["humidity"]["status"] == "no_data" and m["sensors"]["total"] == 30 and m["alerts"]["open"] == 1


def test_thresholds_endpoint(client):
    t = client.get("/api/thresholds").json()
    assert t["aqi"]["warning"] == 100 and t["energy"]["relative_to_baseline"] is True
