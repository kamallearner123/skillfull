"""
SmartGuide — RAG Service
Manages the ChromaDB vector store and sentence-transformer embeddings.

Responsibilities:
  - Embed and store study material chunks (documents, notes, course content)
  - Retrieve top-K relevant chunks for a given query at inference time
  - Provide per-domain collections so retrieval stays contextually scoped
"""
import logging
import os
from typing import List, Optional

import chromadb
from chromadb.config import Settings as ChromaSettings
from sentence_transformers import SentenceTransformer

from app.config import settings

logger = logging.getLogger(__name__)

# ── Embedding model (CPU-friendly; runs alongside the GPU LLM) ────────────────
# all-MiniLM-L6-v2: 22M params, ~80 MB, very fast, good quality for retrieval
_embedder: Optional[SentenceTransformer] = None

def get_embedder() -> SentenceTransformer:
    global _embedder
    if _embedder is None:
        logger.info("Loading embedding model: %s", settings.EMBEDDING_MODEL)
        print("[SMARTGUIDE RAG] Loading embedding model on CPU...")
        _embedder = SentenceTransformer(settings.EMBEDDING_MODEL, device="cpu")
        logger.info("Embedding model ready.")
    return _embedder


# ── ChromaDB client (persistent local store) ─────────────────────────────────
_chroma_client: Optional[chromadb.PersistentClient] = None

def get_chroma_client() -> chromadb.PersistentClient:
    global _chroma_client
    if _chroma_client is None:
        os.makedirs(settings.CHROMA_PERSIST_DIR, exist_ok=True)
        _chroma_client = chromadb.PersistentClient(
            path=settings.CHROMA_PERSIST_DIR,
            settings=ChromaSettings(anonymized_telemetry=False),
        )
        logger.info("ChromaDB client ready at: %s", settings.CHROMA_PERSIST_DIR)
    return _chroma_client


def _collection_name(domain: str) -> str:
    """Sanitise domain string to a valid Chroma collection name."""
    return "sg_" + domain.lower().replace(" ", "_").replace("/", "_")


def get_or_create_collection(domain: str) -> chromadb.Collection:
    client = get_chroma_client()
    name = _collection_name(domain)
    return client.get_or_create_collection(
        name=name,
        metadata={"hnsw:space": "cosine"},
    )


# ── Ingest ────────────────────────────────────────────────────────────────────

def ingest_documents(
    domain: str,
    chunks: List[str],
    metadatas: Optional[List[dict]] = None,
    ids: Optional[List[str]] = None,
) -> int:
    """
    Embed and store text chunks into the domain-specific Chroma collection.

    Args:
        domain:    The placement domain, e.g. "Data Engineering".
        chunks:    List of text strings (sentences, paragraphs, Q&A pairs …).
        metadatas: Optional list of metadata dicts (one per chunk).
        ids:       Optional explicit IDs; auto-generated if not provided.

    Returns:
        Number of chunks ingested.
    """
    if not chunks:
        return 0

    embedder = get_embedder()
    collection = get_or_create_collection(domain)

    embeddings = embedder.encode(chunks, show_progress_bar=False).tolist()

    if ids is None:
        # Deterministic IDs: hash of (domain + chunk index) to allow re-ingest idempotency
        import hashlib
        ids = [
            hashlib.md5(f"{domain}:{i}:{c[:64]}".encode()).hexdigest()
            for i, c in enumerate(chunks)
        ]

    if metadatas is None:
        metadatas = [{"domain": domain, "source": "manual"} for _ in chunks]

    # upsert = add if new, update if same id
    collection.upsert(
        ids=ids,
        embeddings=embeddings,
        documents=chunks,
        metadatas=metadatas,
    )

    logger.info("Ingested %d chunks into collection '%s'", len(chunks), _collection_name(domain))
    return len(chunks)


# ── Retrieval ─────────────────────────────────────────────────────────────────

def retrieve_context(
    domain: str,
    query: str,
    top_k: int = 5,
    where: Optional[dict] = None,
) -> List[str]:
    """
    Retrieve the top-K most relevant text chunks for a query from the domain collection.

    Returns an empty list if the collection doesn't exist or has no documents.
    """
    client = get_chroma_client()
    name = _collection_name(domain)

    try:
        collection = client.get_collection(name)
    except Exception:
        # Collection doesn't exist yet — no material ingested for this domain
        return []

    count = collection.count()
    if count == 0:
        return []

    embedder = get_embedder()
    query_embedding = embedder.encode([query], show_progress_bar=False).tolist()

    results = collection.query(
        query_embeddings=query_embedding,
        n_results=min(top_k, count),
        where=where,
        include=["documents"],
    )

    docs: List[str] = results.get("documents", [[]])[0]
    logger.debug("Retrieved %d chunks for domain '%s', query: '%s'", len(docs), domain, query[:60])
    return docs


# ── Stats ─────────────────────────────────────────────────────────────────────

def collection_stats(domain: str) -> dict:
    """Return basic stats about how many chunks are stored for a domain."""
    client = get_chroma_client()
    name = _collection_name(domain)
    try:
        col = client.get_collection(name)
        return {"domain": domain, "collection": name, "chunk_count": col.count()}
    except Exception:
        return {"domain": domain, "collection": name, "chunk_count": 0}


def list_all_collections() -> List[dict]:
    """Return stats for every SmartGuide collection in the store."""
    client = get_chroma_client()
    cols = [c for c in client.list_collections() if c.name.startswith("sg_")]
    return [{"collection": c.name, "chunk_count": c.count()} for c in cols]
