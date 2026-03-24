from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    PROJECT_NAME: str = "AgentOps"
    VERSION: str = "0.1.0"
    API_V1_PREFIX: str = "/api/v1"
    CORS_ORIGINS: list[str] = ["http://localhost:3000"]
    DATABASE_URL: str = "postgresql+asyncpg://agentops:agentops@localhost:5432/agentops"
    # Public URL of this server — embedded in generated API keys so clients
    # don't need to configure a separate base URL.
    # Defaults to empty string; the route handler falls back to request.base_url.
    SERVER_URL: str = ""

    # Health check SSRF guard — set True in local dev to allow localhost/private IPs
    ALLOW_PRIVATE_HEALTH_URLS: bool = False

    # JWT settings
    SECRET_KEY: str = "change-me-in-production-use-a-long-random-string"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    model_config = {"env_file": ".env", "extra": "ignore"}


settings = Settings()
