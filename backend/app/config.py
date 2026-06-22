from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

BASE_DIR = Path(__file__).resolve().parent.parent


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    # Swapping to Postgres is just changing this URL (and adding psycopg2 to requirements.txt) -
    # nothing else in the app references SQLite directly.
    database_url: str = f"sqlite:///{BASE_DIR / 'data' / 'app.db'}"

    jwt_secret_key: str = "dev-secret-change-me"
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 30

    storage_dir: Path = BASE_DIR / "data" / "storage"
    max_upload_size_bytes: int = 10 * 1024 * 1024  # 10 MB

    allowed_content_types: set[str] = {
        "image/jpeg",
        "image/png",
        "image/gif",
        "image/webp",
        "application/pdf",
        "text/plain",
        "text/csv",
        "application/json",
        "application/zip",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/vnd.ms-excel",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }

    cors_origins: list[str] = ["http://localhost:5173"]


settings = Settings()
settings.storage_dir.mkdir(parents=True, exist_ok=True)
