from functools import lru_cache

from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env", env_file_encoding="utf-8", case_sensitive=False, extra="ignore"
    )

    app_name: str = "TenantCore"
    environment: str = "development"
    demo_mode: bool = True
    api_prefix: str = "/api/v1"
    database_url: str = (
        "postgresql+psycopg://tenantcore_app:tenantcore_app_dev@localhost:5432/tenantcore"
    )
    migration_database_url: str = (
        "postgresql+psycopg://tenantcore:tenantcore_dev@localhost:5432/tenantcore"
    )
    # Only for PostgreSQL-compatible test servers that ignore startup usernames.
    # Production leaves this unset and authenticates directly as tenantcore_app.
    database_role: str | None = None
    redis_url: str = "redis://localhost:6379/0"
    jwt_secret: str = "development-only-change-me-32-bytes"
    jwt_algorithm: str = "HS256"
    access_token_minutes: int = 15
    refresh_token_days: int = 7
    invitation_hours: int = 72
    cors_origins: str = "http://localhost:5309,http://127.0.0.1:5309"
    log_level: str = "INFO"
    rate_limit_fail_open: bool = True
    login_rate_limit: int = 10
    login_rate_window_seconds: int = 900

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]

    @model_validator(mode="after")
    def validate_production_secrets(self) -> "Settings":
        if self.environment == "production":
            if (
                self.jwt_secret == "development-only-change-me-32-bytes"
                or len(self.jwt_secret) < 32
            ):
                raise ValueError("JWT_SECRET must be a random value of at least 32 characters")
            if (
                "tenantcore_app_dev" in self.database_url
                or "tenantcore_dev" in self.migration_database_url
            ):
                raise ValueError("Development database credentials are not allowed in production")
            if self.demo_mode:
                raise ValueError("DEMO_MODE must be false in production")
            if self.rate_limit_fail_open:
                raise ValueError("RATE_LIMIT_FAIL_OPEN must be false in production")
        return self


@lru_cache
def get_settings() -> Settings:
    return Settings()
