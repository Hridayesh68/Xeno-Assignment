from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    database_url: str = "postgresql://postgres:password@localhost:5432/xeno_crm"
    redis_url: str = "redis://localhost:6379/0"
    openai_api_key: str = ""
    channel_stub_url: str = "http://localhost:8001"
    crm_base_url: str = "http://localhost:8000"
    environment: str = "development"

    class Config:
        env_file = ".env"


@lru_cache()
def get_settings() -> Settings:
    return Settings()
