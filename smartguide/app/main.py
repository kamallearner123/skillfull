"""
SmartGuide — FastAPI Application Entry Point
"""
import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.routers import chat, feedback, ingest, schedule, readiness

import os

# ── Logging ──────────────────────────────────────────────────────────────────
LOG_LEVEL = os.environ.get("LOG_LEVEL", "INFO").upper()
logging.basicConfig(
    level=getattr(logging, LOG_LEVEL),
    format="%(asctime)s  %(levelname)-8s  %(name)s — %(message)s",
)
logger = logging.getLogger("smartguide")

# ── App ───────────────────────────────────────────────────────────────────────

app = FastAPI(
    title="SmartGuide API",
    description=(
        "LLM-powered placement coaching microservice for the SkillFull / EduCollab platform. "
        "Provides personalised assessment feedback, study schedules, mock interview chat, "
        "and a RAG knowledge base powered by ChromaDB + sentence-transformers."
    ),
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# ── CORS ──────────────────────────────────────────────────────────────────────

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ───────────────────────────────────────────────────────────────────

app.include_router(feedback.router)
app.include_router(schedule.router)
app.include_router(chat.router)
app.include_router(ingest.router)  # RAG knowledge-base management
app.include_router(readiness.router)

# ── Health & metadata ─────────────────────────────────────────────────────────

@app.get("/health", tags=["Meta"])
async def health():
    return {"status": "ok", "service": "smartguide"}


@app.get("/", tags=["Meta"])
async def root():
    return {
        "service": "SmartGuide",
        "version": "1.0.0",
        "llm_backend": settings.LLM_BACKEND,
        "model": settings.MODEL_NAME,
        "docs": "/docs",
    }


# ── Startup event: eager-load LLM on boot ────────────────────────────────────

@app.on_event("startup")
async def startup_event():
    logger.info("SmartGuide starting up — LLM backend: %s", settings.LLM_BACKEND)

    # Pre-warm LLM
    try:
        from app.services.llm_service import get_llm_backend
        get_llm_backend()  # triggers model load
        logger.info("LLM backend initialised successfully.")
    except Exception as exc:
        logger.warning("LLM backend could not be initialised at startup: %s", exc)

    # Pre-warm embedding model (ChromaDB RAG)
    if settings.RAG_ENABLED:
        try:
            from app.services.rag_service import get_embedder
            get_embedder()  # triggers sentence-transformer load
            logger.info("Embedding model ready: %s", settings.EMBEDDING_MODEL)
        except Exception as exc:
            logger.warning("Embedding model could not be initialised at startup: %s", exc)
