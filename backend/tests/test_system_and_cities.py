def test_root_describes_project_and_simulated_data(client_nodb):
    r = client_nodb.get("/")
    assert r.status_code == 200
    body = r.json()
    assert body["name"] == "SmartTwin Cloud API" and "SIMULATED" in body["data_notice"]


def test_health_reports_database_not_configured(client_nodb):
    r = client_nodb.get("/health")
    assert r.status_code == 200
    body = r.json()
    assert body["status"] == "degraded" and body["database"]["status"] == "not_configured"


def test_list_cities_returns_all_twelve(client_nodb):
    cities = client_nodb.get("/api/cities").json()
    assert len(cities) == 12
    ids = {c["id"] for c in cities}
    assert {"chennai", "coimbatore", "madurai", "trichy", "salem", "tirunelveli", "erode",
            "vellore", "thoothukudi", "thanjavur", "dindigul", "hosur"} == ids
    assert all(-90 < c["latitude"] < 90 and c["region"] for c in cities)


def test_zones_for_unknown_city_is_404_before_database_is_needed(client_nodb):
    r = client_nodb.get("/api/cities/atlantis/zones")
    assert r.status_code == 404 and "atlantis" in r.json()["detail"]


def test_zones_without_database_is_503_with_helpful_message(client_nodb):
    r = client_nodb.get("/api/cities/chennai/zones")
    assert r.status_code == 503 and "DATABASE_URL" in r.json()["detail"]


def test_cors_allows_vite_origin(client_nodb):
    r = client_nodb.options("/api/cities", headers={"Origin": "http://localhost:5173", "Access-Control-Request-Method": "GET"})
    assert r.headers["access-control-allow-origin"] == "http://localhost:5173"


def test_swagger_docs_and_openapi_available(client_nodb):
    assert client_nodb.get("/docs").status_code == 200
    assert "/api/cities/{city_id}/zones" in client_nodb.get("/openapi.json").json()["paths"]
