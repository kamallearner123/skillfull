"""
SmartGuide Microservice — Configuration
All settings are read from environment variables (or a .env file).
"""
from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Literal


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    # ── Server ───────────────────────────────────────────────────────────
    HOST: str = "0.0.0.0"
    PORT: int = 8080
    WORKERS: int = 1  # Keep 1 for GPU; vLLM async handles concurrency internally.
    LOG_LEVEL: str = "info"

    # ── LLM Engine ───────────────────────────────────────────────────────
    # "vllm" | "llama_cpp" | "mock"  (mock = deterministic stub for testing)
    LLM_BACKEND: Literal["vllm", "llama_cpp", "mock"] = "vllm"

    # Model identifier: HuggingFace repo-id or local path
    MODEL_NAME: str = "mistralai/Mistral-7B-Instruct-v0.3"

    # For llama_cpp: local path to .gguf file
    GGUF_MODEL_PATH: str = "./models/mistral-7b-instruct-v0.3.Q4_K_M.gguf"

    # GPU settings
    GPU_MEMORY_UTILIZATION: float = 0.90   # vLLM: fraction of GPU VRAM to use
    MAX_MODEL_LEN: int = 4096              # max context window tokens
    TENSOR_PARALLEL_SIZE: int = 1          # number of GPUs (use >1 for tensor parallelism)

    # Generation defaults
    MAX_NEW_TOKENS: int = 1024
    TEMPERATURE: float = 0.7
    TOP_P: float = 0.9

    # ── Redis (conversation memory) ──────────────────────────────────────
    REDIS_URL: str = "redis://localhost:6379/1"
    REDIS_TTL_SECONDS: int = 86400  # 24 hours per session

    # ── Security ─────────────────────────────────────────────────────────
    # Shared secret between Django backend and SmartGuide (optional extra auth)
    INTERNAL_API_KEY: str = "change-me-in-production"

    # ── CORS ─────────────────────────────────────────────────────────────
    ALLOWED_ORIGINS: list[str] = [
        "http://localhost:5173",   # Vite dev frontend
        "http://localhost:8000",   # Django backend (proxy calls)
    ]

    # ── RAG / Vector DB ──────────────────────────────────────────────────
    # sentence-transformers model used for embedding (runs on CPU alongside the LLM)
    EMBEDDING_MODEL: str = "all-MiniLM-L6-v2"

    # Persistent ChromaDB directory (inside the container; mount as a volume for persistence)
    CHROMA_PERSIST_DIR: str = "./chroma_db"

    # Number of chunks to retrieve per query
    RAG_TOP_K: int = 5

    # Set to False to disable RAG retrieval globally (e.g., for load testing)
    RAG_ENABLED: bool = True


settings = Settings()
