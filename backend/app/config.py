"""Application configuration — supports SQLite (dev) and PostgreSQL (prod)."""
from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    APP_NAME: str = "SENTINEL-X"
    SECRET_KEY: str = "sentinel-x-super-secret-change-in-production-2026"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24

    # Set DATABASE_URL=postgresql+asyncpg://user:pass@host/db for production
    DATABASE_URL: str = "sqlite+aiosqlite:///./sentinel.db"

    CORS_ORIGINS: list[str] = [
        "http://localhost:5173", "http://localhost:3000",
        "http://localhost",      "http://localhost:8080",
    ]

    # LLM providers
    OPENAI_API_KEY:    Optional[str] = None
    ANTHROPIC_API_KEY: Optional[str] = None
    AI_PROVIDER: str = "auto"           # auto | openai | anthropic | builtin
    OPENAI_MODEL:    str = "gpt-4o-mini"
    ANTHROPIC_MODEL: str = "claude-sonnet-4-20250514"

    # Rate limiting (requests / minute per IP)
    RATE_LIMIT_DEFAULT: str = "60/minute"
    RATE_LIMIT_AI:      str = "30/minute"
    RATE_LIMIT_SCAN:    str = "10/minute"

    class Config:
        env_file = ".env"


settings = Settings()
