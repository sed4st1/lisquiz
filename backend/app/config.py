import os
from pydantic_settings import BaseSettings
from typing import List

class Settings(BaseSettings):
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    DEBUG: bool = True
    SECRET_KEY: str = "lisquiz-secret-key-2026"
    CORS_ORIGINS: str = "http://localhost:3000,http://localhost:5173,http://127.0.0.1:3000,http://127.0.0.1:5173,https://dev.max.ru"

    # MAX Platform
    MAX_BOT_TOKEN: str = ""
    MAX_APP_ID: str = ""
    MAX_APP_SECRET: str = ""
    MAX_WEBHOOK_URL: str = ""

    # AI / LLM
    LLM_PROVIDER: str = "mock"  # mock, gigachat, yandexgpt
    GIGACHAT_CREDENTIALS: str = ""
    GIGACHAT_SCOPE: str = "GIGACHAT_API_PERS"
    YANDEX_GPT_API_KEY: str = ""
    YANDEX_FOLDER_ID: str = ""

    # DB & Redis
    DATABASE_URL: str = "sqlite+aiosqlite:///./lisquiz.db"
    REDIS_URL: str = "redis://redis:6379/0"

    @property
    def cors_origins_list(self) -> List[str]:
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]

    class Config:
        env_file = ".env"
        extra = "allow"

settings = Settings()
