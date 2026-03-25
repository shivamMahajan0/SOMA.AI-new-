"""
SOMA.AI Backend Configuration
"""
import os
from pathlib import Path
from pydantic_settings import BaseSettings
from dotenv import load_dotenv

load_dotenv()

BASE_DIR = Path(__file__).resolve().parent


class Settings(BaseSettings):
    APP_NAME: str = "SOMA.AI"
    APP_VERSION: str = "2.0.0"
    ENVIRONMENT: str = "development"
    DEBUG: bool = True

    # MongoDB
    MONGODB_URI: str = "mongodb://localhost:27017"
    MONGODB_DB_NAME: str = "soma_ai"

    # Directories
    UPLOAD_DIR: str = str(BASE_DIR / "uploads")
    OUTPUT_DIR: str = str(BASE_DIR / "outputs")

    # OpenRouter LLM
    OPENROUTER_API_KEY: str = ""
    OPENROUTER_MODEL: str = "openai/gpt-4o-mini"
    OPENROUTER_BASE_URL: str = "https://openrouter.ai/api/v1"
    
    # Gemini (Audio fallback, etc)
    GEMINI_API_KEY: str = ""

    # Extra APIs
    TAVILY_API_KEY: str = ""

    # ML Settings
    MAX_UPLOAD_SIZE_MB: int = 100
    MAX_MODELS_TO_TRAIN: int = 8
    CV_FOLDS: int = 3
    TUNING_ITERATIONS: int = 10

    class Config:
        env_file = ".env"
        extra = "allow"


settings = Settings()

# Set DEBUG based on environment
if settings.ENVIRONMENT == "production":
    settings.DEBUG = False

os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
os.makedirs(settings.OUTPUT_DIR, exist_ok=True)
