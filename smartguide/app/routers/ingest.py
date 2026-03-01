"""
SmartGuide — /ingest router
Accepts study material (text chunks, Q&A pairs, course notes) and stores them
in the ChromaDB vector store for RAG-enhanced feedback and scheduling.
"""
import logging

from fastapi import APIRouter, HTTPException

from app.schemas.ingest import (
    CollectionStatsResponse, IngestRequest, IngestResponse,
)
from app.services import rag_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/ingest", tags=["RAG / Knowledge Base"])


@router.post("", response_model=IngestResponse, summary="Ingest study material into the vector store")
async def ingest_documents(req: IngestRequest):
    """
    Store text chunks in the ChromaDB vector collection for a given domain.

    **Typical use cases:**
    - Ingest course notes, PDFs (pre-chunked), textbook excerpts
    - Add curated Q&A pairs for mock interview context
    - Push topic summaries for schedule generation

    Chunks are embedded with `sentence-transformers` and stored persistently.
    Duplicate chunks (same domain + index + first 64 chars) are silently upserted.
    """
    texts = [c.text for c in req.chunks]
    metadatas = [
        {
            "domain": req.domain,
            "source": c.source or "manual",
            "topic": c.topic or "",
        }
        for c in req.chunks
    ]

    try:
        ingested = rag_service.ingest_documents(
            domain=req.domain,
            chunks=texts,
            metadatas=metadatas,
        )
    except Exception as exc:
        logger.exception("Ingest failed for domain '%s'", req.domain)
        raise HTTPException(status_code=500, detail=f"Ingest error: {exc}")

    stats = rag_service.collection_stats(req.domain)
    return IngestResponse(
        domain=req.domain,
        chunks_ingested=ingested,
        collection_total=stats["chunk_count"],
        message=f"Successfully ingested {ingested} chunk(s) into '{req.domain}' knowledge base.",
    )


@router.get("/stats", response_model=CollectionStatsResponse, summary="List all knowledge base collections")
async def get_stats():
    """Return the number of stored chunks per domain collection."""
    return CollectionStatsResponse(collections=rag_service.list_all_collections())


@router.get("/stats/{domain}", summary="Stats for a specific domain")
async def get_domain_stats(domain: str):
    """Return chunk count for a single domain's knowledge base."""
    return rag_service.collection_stats(domain)
