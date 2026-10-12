# SmartTwin Cloud: Tamil Nadu Smart City Digital Twin (Frontend)

React + Vite dashboard for 12 Tamil Nadu cities: Chennai, Coimbatore, Madurai, Tiruchirappalli (Trichy),
Salem, Tirunelveli, Erode, Vellore, Thoothukudi, Thanjavur, Dindigul and Hosur.

> **All data is SIMULATED.** Zones, sensors, readings, alerts and the map are illustrative. They are not
> official or live measurements, and no IoT devices, AI models or cloud services are connected.
> Data now comes from the FastAPI + PostgreSQL backend (see "Backend connection" below).

## Requirements
- Windows 10 or 11
- **Node.js 18 or newer** (the LTS version from https://nodejs.org). Check with:
  ```powershell
  node --version
  npm --version
  ```

## Setup (Windows PowerShell)
1. Unzip the project, then open PowerShell in the project folder:
   ```powershell
   cd path\to\smarttwin-frontend
   ```
2. Install dependencies (first time only, needs internet):
   ```powershell
   npm install
   ```
3. Start the development server:
   ```powershell
   npm run dev
   ```
4. Open **http://localhost:5173** in your browser. Press `Ctrl + C` in PowerShell to stop the server.

## Other commands
```powershell
npm run build      # production build into the dist folder (also a good check that everything compiles)
npm run preview    # serve the production build locally at http://localhost:4173
```

## Troubleshooting
- **"npm.ps1 cannot be loaded because running scripts is disabled"**: run this once in the same window, then retry:
  ```powershell
  Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
  ```
  (Or use Command Prompt instead of PowerShell.)
- **Port 5173 is busy**: Vite starts on the next free port and prints the address. Use that address.
  If you later connect the FastAPI backend, add that port to the backend's `CORS_ORIGINS` setting.
- **Node version error**: install the current Node.js LTS and open a new PowerShell window.
- **Odd install errors**: delete the `node_modules` folder and run `npm install` again.

## Project structure
```
smarttwin-frontend/
  package.json  index.html  vite.config.js  README.md
  src/
    main.jsx  App.jsx  styles.css
    data/        simulator.js (simulated multi-city data), cityLayout.js (map geometry)
    hooks/       useNow.js (5-second refresh)
    utils/       format.js
    components/  Sidebar, Filters, CityMap, CityCard, StatCard, LineChart, Charts, ZoneCompare,
                 ZonePanel, ZoneDetail, AlertsPanel, AlertDetail, SensorStatus, SensorDetail, ...
    pages/       StatePage, ComparePage, Overview, ZonesPage, AlertsPage, SensorsPage
```

## Features
- Global city selector (12 cities) and time-range filter with custom dates
- Tamil Nadu overview: state KPIs, map, city cards, energy analytics
- City dashboards: zones, traffic, environment, energy, sensors, alerts and incidents
- Interactive Tamil Nadu map and per-city zone map
- Two-city comparison, zone comparison, acknowledge/resolve workflow (kept in memory only)

## Backend connection
The dashboard loads cities, zones, sensors, readings, charts and alerts from the FastAPI backend.
1. Start PostgreSQL and the backend first (see the backend README): `uvicorn app.main:app --reload --host 127.0.0.1 --port 8000`.
2. Start the simulator in another terminal so values keep changing: `python simulator.py`.
3. In this folder run `npm install` then `npm run dev`, and open http://localhost:5173.

The API address defaults to `http://127.0.0.1:8000`. To change it, copy `.env.example` to `.env`, edit `VITE_API_BASE_URL`, and restart `npm run dev`.
If the backend is down you will see an error screen with a "Try again" button. If the database is empty you will see an empty-state message.
`src/data/dataSource.js` is the only file that talks to the API (through `src/data/api.js`). The old `src/data/simulator.js` is no longer used by the app and is kept only for reference.
Acknowledging or resolving an alert is saved in PostgreSQL. The sensor battery, signal and firmware shown on the Sensors page are illustrative demo values.
