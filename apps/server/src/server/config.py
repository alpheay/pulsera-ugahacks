"""Pulsera server configuration via Pydantic Settings."""

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    DATABASE_URL: str = "sqlite+aiosqlite:///./pulsera.db"

    PULSENET_CHECKPOINT_DIR: str = "checkpoints"

    CORS_ORIGINS: list[str] = ["http://localhost:3000", "http://localhost:3001"]

    WS_AUTH_TIMEOUT: int = 30

    ANOMALY_THRESHOLD: float = 0.5
    COMMUNITY_ANOMALY_THRESHOLD: float = 0.6
    COMMUNITY_MIN_AFFECTED: int = 3
    ZONE_AGGREGATION_WINDOW: int = 300  # seconds

    ELEVENLABS_API_KEY: str = ""
    ELEVENLABS_AGENT_ID: str = ""

    GEMINI_API_KEY: str = ""
    GEMINI_MODEL: str = "gemini-2.0-flash"

    LLM_API_KEY: str = ""
    LLM_MODEL: str = "claude-sonnet-4-5-20250929"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()
