"""Application configuration using Pydantic Settings.

No hardcoded date defaults — dates are always required from the caller
or computed dynamically at request time.
"""

from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    # Elexon BMRS API
    ELEXON_BASE_URL: str = "https://data.elexon.co.uk/bmrs/api/v1"
    ELEXON_API_KEY: str = ""  # Not required for public endpoints

    # CORS
    CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://localhost:3000",
        "https://*.vercel.app",
        "*",
    ]

    # Cache (in-memory TTL in seconds)
    CACHE_TTL_SECONDS: int = 300  # 5 minutes

    # HTTP client
    HTTP_TIMEOUT: int = 60
    HTTP_MAX_RETRIES: int = 3


settings = Settings()
