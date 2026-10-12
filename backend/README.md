# SmartTwin Cloud: Backend (FastAPI + PostgreSQL)

Backend for **SmartTwin Cloud: Tamil Nadu Smart City Digital Twin**.
> All sensor readings and alerts are **SIMULATED sample data**. They are not real or official measurements, and no real city sensors are connected.

```
React frontend (port 5173)  --HTTP-->  FastAPI backend (port 8000)  --SQL-->  PostgreSQL (port 5432)
                                              ^
                       simulator.py  --------- writes a new simulated reading for every sensor every N seconds
```

## 1. Where everything goes
Keep the frontend and backend in separate folders inside one parent folder:
```
smarttwin-cloud\
  smarttwin-frontend\    <- React app (from smarttwin-frontend-connected.zip)
  backend\               <- this folder (from smarttwin-backend-complete.zip)
```
**Back up first.** Rename your current `smarttwin-frontend` folder to `smarttwin-frontend_old`, and any older `backend` folder to `backend_old`, then unzip the new ones. Your old folders stay untouched.

## 2. Prerequisites (check each in PowerShell)
| Tool | Check command | Notes |
|---|---|---|
| Python 3.10 to 3.13 | `python --version` | https://www.python.org/downloads/ (tick "Add python.exe to PATH") |
| Node.js 18+ | `node --version` | for the frontend, https://nodejs.org (LTS) |
| PostgreSQL 14+ **or** Docker Desktop | `psql --version` / `docker --version` | see section 3 |

## 3. PostgreSQL: choose ONE option
### Option A: install PostgreSQL on Windows
1. Download the installer from https://www.postgresql.org/download/windows/ and install it. Remember the password you set for the `postgres` user. Keep port `5432`.
2. Open PowerShell. If `psql` is not recognised, use the full path (adjust the version number): `& "C:\Program Files\PostgreSQL\16\bin\psql.exe" ...` or add `C:\Program Files\PostgreSQL\16\bin` to PATH.
3. Create your own database user, the development database and a separate test database (it asks for the `postgres` password each time). Replace `YOUR_PASSWORD` with a password you choose:
```powershell
psql -U postgres -h localhost -c "CREATE USER smarttwin_user WITH PASSWORD 'YOUR_PASSWORD';"
psql -U postgres -h localhost -c "CREATE DATABASE smarttwin OWNER smarttwin_user;"
psql -U postgres -h localhost -c "CREATE DATABASE smarttwin_test OWNER smarttwin_user;"
```
### Option B: PostgreSQL in Docker
Do section 5 first (it creates `.env` with your password), then in the `backend` folder:
```powershell
docker compose up -d
docker compose ps
```
This creates both `smarttwin` and `smarttwin_test`. Stop it later with `docker compose down` (data is kept).

## 4. Python environment (run in the `backend` folder)
```powershell
cd path\to\smarttwin-cloud\backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -r requirements-dev.txt
```
If activation says "running scripts is disabled", run `Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass` and activate again. You must activate the environment in **every new PowerShell window** you use for the backend.

## 5. Configuration (`.env`)
```powershell
Copy-Item .env.example .env
notepad .env
```
Replace `CHANGE_ME` (3 places: `DATABASE_URL`, `TEST_DATABASE_URL`, `POSTGRES_PASSWORD`) with your password. `.env` is ignored by Git, so your password is never committed. Never share this file.

## 6. Create the tables and add sample data (run in `backend`, environment active)
```powershell
alembic upgrade head
python -m app.db.seed
```
`alembic upgrade head` creates the tables (zones, sensors, sensor_readings, alerts). `python -m app.db.seed` adds 72 zones and 360 sensors (5 per zone) and 7 days of **simulated** history (about 140,000 readings, takes under a minute). Both commands are safe to repeat: they never delete or overwrite data. Use `python -m app.db.seed --no-history` to skip the history.

## 7. Start the API (terminal 1, in `backend`)
```powershell
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```
Open **http://127.0.0.1:8000/docs** (Swagger page): click an endpoint, then **Try it out** and **Execute**. Stop with `Ctrl + C`.

## 8. Start the simulator (terminal 2, in `backend`, environment active)
```powershell
python simulator.py
```
Every 60 seconds it stores one simulated reading per working sensor and checks alert thresholds. Useful options:
```powershell
python simulator.py --interval 10                 # faster, good for demos (minimum 1 second)
python simulator.py --city chennai --city madurai # only some cities
python simulator.py --once                        # one round, then exit
```
Stop with `Ctrl + C` (it finishes cleanly). Only one simulator can run at a time (a database lock stops duplicates). Data growth is bounded: readings older than 7 days (`SIMULATOR_RETENTION_DAYS`) are deleted automatically. Sensors marked "offline" in the sample data do not report.

## 9. Start the frontend (terminal 3)
```powershell
cd path\to\smarttwin-cloud\smarttwin-frontend
npm install
npm run dev
```
Open **http://localhost:5173**. The API address defaults to `http://127.0.0.1:8000`; to change it copy `.env.example` to `.env` in the frontend folder and edit `VITE_API_BASE_URL`.

## 10. Check that the data really comes from FastAPI and PostgreSQL
1. The header shows "Backend connected · updated HH:MM:SS". The banner says the data comes from the FastAPI backend and PostgreSQL.
2. Open http://127.0.0.1:8000/api/readings/latest?city_id=chennai, wait for a simulator round, refresh: `recorded_at` and `value` change.
3. Count the rows in the database (it grows while the simulator runs):
```powershell
psql -U smarttwin_user -h localhost -d smarttwin -c "SELECT count(*) FROM sensor_readings;"
```
4. Open the **Alerts** page, click **Acknowledge** on an open alert, press F5. It stays acknowledged because it is saved in PostgreSQL.
5. Stop the backend (`Ctrl + C`): the dashboard shows an error screen or "Lost connection" banner. Start it again and click **Try again**.

## 11. Run the automated tests (in `backend`, environment active)
```powershell
pytest
```
- Tests that need PostgreSQL run against the **separate** `TEST_DATABASE_URL` database (name must contain `test`; it is wiped and rebuilt with the Alembic migration each run). Your development database is never touched.
- If `TEST_DATABASE_URL` is not set, the database tests are **skipped** (not faked) and only the logic and model tests run.
- Result on the author's machine: **59 passed** with PostgreSQL 16 (see "Test coverage" below).

## 12. API summary (all under http://127.0.0.1:8000)
| Method and path | Purpose |
|---|---|
| `GET /` , `GET /health` | API info; health with database status |
| `GET /api/cities` | the 12 cities |
| `GET /api/cities/{city_id}/zones` , `GET /api/zones?city_id=` | zones |
| `GET /api/cities/{city_id}/metrics` | dashboard metrics: averages, per-zone status, sensor and alert counts |
| `GET /api/sensors?city_id=&zone_id=&sensor_type=&status=&limit=&offset=` | list sensors |
| `GET /api/sensors/{sensor_id}` | one sensor |
| `GET /api/sensors/{sensor_id}/readings?start=&end=&limit=&offset=` | its readings, oldest first |
| `POST /api/sensors/{sensor_id}/readings` | submit `{"value": 55.2, "recorded_at": "...optional..."}` (201; 422 if invalid) |
| `GET /api/readings?city_id=&zone_id=&sensor_id=&metric=&start=&end=&limit=&offset=` | history, oldest first (default: last 24 h, max 5000 rows) |
| `GET /api/readings/latest`, `GET /api/readings/timeseries` | latest values; bucketed averages for charts |
| `GET /api/alerts?city_id=&zone_id=&severity=&status=&limit=&offset=` , `GET /api/alerts/{id}` | alerts, newest first |
| `PATCH /api/alerts/{id}` | `{"status": "acknowledged"}` or `{"status": "resolved", "note": "..."}` (409 for invalid change) |
| `GET /api/thresholds` | the alert limits in use |

City IDs: chennai, coimbatore, madurai, trichy, salem, tirunelveli, erode, vellore, thoothukudi, thanjavur, dindigul, hosur. Metrics: traffic, aqi, temperature, humidity, energy. Errors are JSON with a readable `detail` message (404 not found, 409 conflict, 422 invalid input, 503 database unavailable).

## 13. How alerts work (`app/core/thresholds.py`, `app/services/alert_logic.py`)
| Metric | Warning | Critical |
|---|---|---|
| Traffic congestion | 70 % | 90 % |
| AQI | 100 | 200 |
| Temperature | 38 °C | 42 °C |
| Humidity | 85 % | 95 % |
| Energy | 1.25 x zone baseline kW | 1.5 x baseline |

- Every stored reading is checked. A new **open** alert is created when a value crosses a limit.
- While the sensor stays abnormal, **no new alert** is created (one active alert per sensor and type, also enforced by a database index). If it gets worse (warning to critical) the same alert is escalated.
- When the value returns to normal the alert is **auto-resolved**. After any alert is triggered or resolved, no new alert of that type is created for `ALERT_COOLDOWN_SECONDS` (default 300) to avoid flapping.
- Acknowledged alerts still count as active. To change limits, edit `thresholds.py`; to change the cooldown, set `ALERT_COOLDOWN_SECONDS` in `.env`.

## 14. Troubleshooting
| Message or symptom | Fix |
|---|---|
| `connection refused` / `Cannot connect to the database` | PostgreSQL is not running (start the Windows service "postgresql-x64-16" in Services, or `docker compose up -d`) or the port in `DATABASE_URL` is wrong. |
| `password authentication failed` | The password in `.env` differs from the one you set. URL-encode special characters (`@` becomes `%40`). |
| `database "smarttwin" does not exist` | Run the three `CREATE ...` commands in section 3. |
| `relation "zones" does not exist` or `/api/...` returns 500 | Migrations not applied: run `alembic upgrade head`. |
| `503 Database is not configured` | `backend\.env` is missing or has no `DATABASE_URL` (section 5). |
| `DATABASE_URL is not set` from alembic or seed | Run the command inside the `backend` folder, after creating `.env`. |
| `ModuleNotFoundError` | Activate the environment (`.\.venv\Scripts\Activate.ps1`) and run `pip install -r requirements-dev.txt`. |
| `Address already in use` (port 8000 or 5173) | Close the other program, or use `--port 8001` and set `VITE_API_BASE_URL` in the frontend `.env`. |
| `Another simulator is already running` | Stop the other simulator window (`Ctrl + C`). |
| Browser console: CORS error / frontend says "Cannot reach the backend" | Start uvicorn first. If Vite uses another port (for example 5174), add it to `CORS_ORIGINS` in `backend\.env` and restart uvicorn. |
| Dashboard says "The database has no readings yet" | Run `python -m app.db.seed` and `python simulator.py`. |
| Charts look flat for 1H right after seeding | The simulator has not run long enough; wait a few rounds or run it with `--interval 10`. |
| Tests skipped | Set `TEST_DATABASE_URL` in `.env` (section 5) and create `smarttwin_test`. |

## 15. Test coverage (59 tests)
`tests/test_logic.py` (no database): thresholds, alert decisions (dedup, escalate, resolve, cooldown), simulator bounds and repeatability.
`tests/test_system_and_cities.py`, `tests/test_models.py` (no database): root, health, cities, 404/503 behaviour, CORS, docs, table design.
`tests/test_api_db.py` (PostgreSQL): zones, sensors, valid and invalid readings, history filters/limits/ordering, latest and timeseries, alert creation, dedup, escalation, auto-resolve, cooldown, list/filter/get/acknowledge/resolve, unknown IDs, dashboard metrics.
`tests/test_simulator_and_seed.py` (PostgreSQL): the migration and its unique alert index, idempotent seed, simulator rounds, backfill, pruning, and the one-simulator lock.

## 16. Known limitations
- The data is simulated; the "SIM" labels in the UI and `data_source` fields are intentional.
- No login or user accounts yet: anyone who can reach the API can acknowledge alerts.
- Sensor battery, signal and firmware on the frontend Sensors page are illustrative demo values (the backend does not store them).
- Cities are defined in `app/data/catalog.py` (no cities table). Zones are illustrative areas, not official boundaries.
- This is a local development setup; AWS deployment is a later step.
