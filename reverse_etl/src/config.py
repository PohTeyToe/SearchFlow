"""Configuration for the Reverse-ETL service."""

import os
from dataclasses import dataclass


@dataclass
class Config:
    """Reverse-ETL service configuration."""
    
    # DuckDB warehouse
    duckdb_path: str = os.getenv("DUCKDB_PATH", "/data/searchflow.duckdb")
    
    # PostgreSQL (CRM destination)
    postgres_host: str = os.getenv("POSTGRES_HOST", "localhost")
    postgres_port: int = int(os.getenv("POSTGRES_PORT", "5432"))
    postgres_db: str = os.getenv("POSTGRES_DB", "searchflow")
    postgres_user: str = os.getenv("POSTGRES_USER", "searchflow")
    postgres_password: str = os.getenv("POSTGRES_PASSWORD", "searchflow123")
    
    # Redis (real-time cache destination)
    redis_host: str = os.getenv("REDIS_HOST", "localhost")
    redis_port: int = int(os.getenv("REDIS_PORT", "6379"))
    
    # Sync configuration
    batch_size: int = 1000
    
    @property
    def postgres_connection_string(self) -> str:
        return f"postgresql://{self.postgres_user}:{self.postgres_password}@{self.postgres_host}:{self.postgres_port}/{self.postgres_db}"


config = Config()
