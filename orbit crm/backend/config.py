from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    database_url: str = "postgresql://postgres:password@localhost:5432/xeno_crm"
    redis_url: str = "redis://localhost:6379/0"
    openai_api_key: str = ""
    groq_api_key: str = ""
    gemini_api_key: str = ""
    groq_model: str = "llama-3.3-70b-versatile"
    channel_stub_url: str = "http://localhost:8001"
    crm_base_url: str = "http://100.53.223.156:8000"
    environment: str = "development"
    secret_key: str = "xeno_secret_key_change_me_in_production"

    class Config:
        env_file = ".env"
        extra = "ignore"



@lru_cache()
def get_settings() -> Settings:
    return Settings()
