from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List, Optional
import os
import secrets
from pydantic import model_validator


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    APP_ENV: str = "development"
    APP_SECRET_KEY: str = "changeme"
    ALLOWED_ORIGINS: List[str] = ["http://localhost:5173"]

    POSTGRES_HOST: str = "db"
    POSTGRES_PORT: int = 5432
    POSTGRES_DB: str = "dasiboard"
    POSTGRES_USER: str = "dasiboard"
    POSTGRES_PASSWORD: str = "changeme"

    JWT_SECRET_KEY: Optional[str] = None
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # Key to create/delete global calendar events
    GLOBAL_EVENTS_KEY: str = "changeme-global-key"

    # ── Entity member keys ────────────────────────────────
    # Set these to restrict joining an entity behind a password.
    # Leave unset (or empty string) to make the entity open — anyone can join.
    #
    # Naming pattern: ENTITY_KEY_<SLUG_UPPERCASED_DASHES_TO_UNDERSCORES>
    #   slug "dasi"          → ENTITY_KEY_DASI
    #   slug "each-in-shell" → ENTITY_KEY_EACH_IN_SHELL
    #   slug "semana-si"     → ENTITY_KEY_SEMANA_SI
    #   slug "lab-minas"     → ENTITY_KEY_LAB_MINAS
    #   slug "pet-si"        → ENTITY_KEY_PET_SI
    #
    ENTITY_KEY_DASI:          Optional[str] = None
    ENTITY_KEY_EACH_IN_SHELL: Optional[str] = None
    ENTITY_KEY_HYPE:          Optional[str] = None
    ENTITY_KEY_CONWAY:        Optional[str] = None
    ENTITY_KEY_CODELAB:       Optional[str] = None
    ENTITY_KEY_SINTESE:       Optional[str] = None
    ENTITY_KEY_SEMANA_SI:     Optional[str] = None
    ENTITY_KEY_LAB_MINAS:     Optional[str] = None
    ENTITY_KEY_PET_SI:        Optional[str] = None
    ENTITY_KEY_GRACE:         Optional[str] = None

    def get_entity_key(self, slug: str) -> Optional[str]:
        """
        Returns the required join key for an entity slug, or None if open.

        Converts slug to env-var name:
            'each-in-shell' → ENTITY_KEY_EACH_IN_SHELL
            'lab-minas'     → ENTITY_KEY_LAB_MINAS

        Checks typed Pydantic fields first (covers all known slugs above),
        then falls back to os.environ for any slug added in the future without
        a restart/redeploy of this file.
        """
        env_name = "ENTITY_KEY_" + slug.upper().replace("-", "_")
        # Typed field (preferred — goes through pydantic validation)
        val = getattr(self, env_name, None)
        if val:
            return val
        # Dynamic fallback for future slugs not yet listed above
        return os.environ.get(env_name) or None

    @model_validator(mode="after")
    def ensure_secure_jwt_secret(self):
        insecure = {"", "changeme", "changeme-jwt-secret"}
        if not self.JWT_SECRET_KEY:
            if self.APP_ENV == "development":
                self.JWT_SECRET_KEY = secrets.token_urlsafe(64)
            else:
                raise ValueError("JWT_SECRET_KEY ausente. Configure uma chave forte via variável de ambiente.")
        if self.JWT_SECRET_KEY in insecure or len(self.JWT_SECRET_KEY) < 32:
            raise ValueError("JWT_SECRET_KEY insegura. Configure uma chave forte com no mínimo 32 caracteres.")
        allowed_algs = {"HS256", "HS384", "HS512"}
        if self.JWT_ALGORITHM not in allowed_algs:
            raise ValueError("JWT_ALGORITHM inválido. Use HS256, HS384 ou HS512.")
        return self


settings = Settings()
