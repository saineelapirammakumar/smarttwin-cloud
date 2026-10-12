"""Application settings, read from environment variables or the backend/.env file."""
from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

BASE_DIR = Path(__file__).resolve().parents[2]  # the backend/ folder


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=BASE_DIR / ".env", env_file_encoding="utf-8", extra="ignore")

    project_name: str = "SmartTwin Cloud API"
    version: str = "0.1.0"
    environment: str = "development"
    # Example: postgresql+psycopg://user:password@localhost:5432/smarttwin  (None until you create .env)
    database_url: str | None = None
    # Comma-separated list of browser origins allowed to call this API (the Vite dev server).
    alert_cooldown_seconds: int = 300  # no new alert for the same sensor/type within this time of the last one
    sim_timezone: str = "Asia/Kolkata"  # timezone used for simulated daily patterns (rush hours)
    simulator_interval_seconds: float = 60
    simulator_retention_days: int = 7  # simulator deletes simulated readings older than this
    cors_origins: str = "http://localhost:5173,http://127.0.0.1:5173"

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
