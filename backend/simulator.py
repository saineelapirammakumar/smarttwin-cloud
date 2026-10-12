"""SIMULATED sensor data generator. Run from the backend folder:
    python simulator.py                      # all cities, interval from .env (default 60 s)
    python simulator.py --interval 10 --city chennai --city madurai
    python simulator.py --once               # one round, then exit
Stop with Ctrl + C. Every reading is labelled 'simulated'. Only ONE simulator can run at a time
(a PostgreSQL advisory lock prevents duplicates)."""
import argparse
import logging
import signal
import sys
import threading

from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.db.session import get_engine
from app.services.simulation import prune_old_readings, run_tick

LOCK_KEY = 726_150_001  # arbitrary number identifying "the SmartTwin simulator"
log = logging.getLogger("simulator")


def acquire_lock(engine):
    """Returns an open connection holding the lock, or None if another simulator already runs."""
    conn = engine.connect()
    if conn.execute(text("SELECT pg_try_advisory_lock(:k)"), {"k": LOCK_KEY}).scalar():
        conn.commit()
        return conn
    conn.close()
    return None


def main(argv=None) -> int:
    s = get_settings()
    p = argparse.ArgumentParser(description="SmartTwin simulated sensor generator")
    p.add_argument("--interval", type=float, default=s.simulator_interval_seconds, help="seconds between rounds")
    p.add_argument("--city", action="append", help="limit to a city id (repeatable)")
    p.add_argument("--retention-days", type=int, default=s.simulator_retention_days, help="delete readings older than this")
    p.add_argument("--once", action="store_true", help="run a single round and exit")
    args = p.parse_args(argv)
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
    if not s.database_url:
        log.error("DATABASE_URL is not set. Create backend/.env first (see README).")
        return 1
    if args.interval < 1:
        log.error("--interval must be at least 1 second")
        return 2
    engine = get_engine(s)
    try:
        lock = acquire_lock(engine)
    except SQLAlchemyError as exc:
        log.error("Cannot connect to PostgreSQL (%s). Is it running and is DATABASE_URL correct?", type(exc).__name__)
        return 1
    if lock is None:
        log.error("Another simulator is already running. Stop it first (Ctrl + C in its window).")
        return 3
    stop = threading.Event()
    for name in ("SIGINT", "SIGTERM", "SIGBREAK"):  # SIGBREAK exists on Windows only
        if hasattr(signal, name):
            signal.signal(getattr(signal, name), lambda *_: stop.set())
    log.info("Simulator started (SIMULATED data). Interval %.0fs, retention %d days. Press Ctrl + C to stop.", args.interval, args.retention_days)
    rounds = 0
    try:
        while not stop.is_set():
            try:
                with Session(engine) as db:
                    r = run_tick(db, cities=args.city)
                    log.info("Stored %d simulated readings, %d alert changes", r["readings"], r["alert_events"])
                    rounds += 1
                    if rounds % 60 == 1:
                        n = prune_old_readings(db, args.retention_days)
                        if n:
                            log.info("Deleted %d readings older than %d days", n, args.retention_days)
            except SQLAlchemyError as exc:
                log.error("Database error (%s). Will retry in %.0fs.", type(exc).__name__, args.interval)
            if args.once:
                break
            stop.wait(args.interval)
    finally:
        try:
            lock.execute(text("SELECT pg_advisory_unlock(:k)"), {"k": LOCK_KEY})
            lock.close()
        except SQLAlchemyError:
            pass
        log.info("Simulator stopped.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
