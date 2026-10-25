"""Application configuration using Pydantic Settings."""

import os
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

    # Data scope
    DATA_START_DATE: str = "2026-01-01"
    DATA_END_DATE: str = "2026-01-31"

    # HTTP client
    HTTP_TIMEOUT: int = 60
    HTTP_MAX_RETRIES: int = 3


settings = Settings()
