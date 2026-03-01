import json
import os
import logging
import requests
from django.http import StreamingHttpResponse, HttpResponse
from ninja import Router, Schema
from ninja.security import django_auth
from typing import Any

logger = logging.getLogger(__name__)

router = Router()

# URL of the SmartGuide microservice (configurable via env)
SMARTGUIDE_URL = os.environ.get("SMARTGUIDE_URL", "http://localhost:8080")
PROXY_TIMEOUT = int(os.environ.get("SMARTGUIDE_TIMEOUT", "120"))

def _forward(method: str, path: str, data: dict | None = None) -> dict | Any:
    """Forward a JSON request to SmartGuide and return the response dict."""
    url = f"{SMARTGUIDE_URL}{path}"
    try:
        resp = requests.request(
            method,
            url,
            json=data,
            timeout=PROXY_TIMEOUT,
        )
        resp.raise_for_status()
        return resp.json()
    except requests.exceptions.ConnectionError:
        return {"error": "SmartGuide service is unavailable. Please try again later."}
    except requests.exceptions.Timeout:
        return {"error": "SmartGuide service timed out."}
    except Exception as exc:
        logger.exception("SmartGuide proxy error for %s %s", method, path)
        return {"error": str(exc)}

# ─── Schemas ──────────────────────────────────────────────────────────────────

class FeedbackRequestSchema(Schema):
    attempt_id: str
    student_name: str
    domain: str
    score: int
    total: int
    percentage: float
    weak_topics: list[str] = []
    strong_topics: list[str] = []

class ScheduleRequestSchema(Schema):
    student_name: str
    domain: str
    weak_topics: list[str] = []
    strong_topics: list[str] = []
    target_date: str
    available_hours_per_day: float = 2.0
    goal: str = "Interview"

class ChatRequestSchema(Schema):
    session_id: str
    message: str
    context: str | None = None
    stream: bool = True

class SessionClearSchema(Schema):
    session_id: str

class DocumentChunkSchema(Schema):
    text: str
    source: str | None = None
    topic: str | None = None

class IngestRequestSchema(Schema):
    domain: str
    chunks: list[DocumentChunkSchema]

# ─── Endpoints ────────────────────────────────────────────────────────────────

@router.post("/feedback", auth=django_auth)
def proxy_feedback(request, data: FeedbackRequestSchema):
    """Generate AI-powered placement feedback for a completed assessment."""
    return _forward("POST", "/feedback", data.dict())

@router.post("/schedule", auth=django_auth)
def proxy_schedule(request, data: ScheduleRequestSchema):
    """Generate a personalised study schedule."""
    return _forward("POST", "/schedule", data.dict())

@router.post("/chat", auth=django_auth)
def proxy_chat(request, data: ChatRequestSchema):
    """
    Forward chat request to SmartGuide.
    For streaming (SSE), returns a StreamingHttpResponse directly.
    """
    url = f"{SMARTGUIDE_URL}/chat"
    try:
        resp = requests.post(
            url,
            json=data.dict(),
            stream=data.stream,
            timeout=PROXY_TIMEOUT,
        )
        resp.raise_for_status()

        if data.stream:
            def _stream_generator():
                for chunk in resp.iter_content(chunk_size=None):
                    yield chunk

            return StreamingHttpResponse(
                _stream_generator(),
                content_type="text/event-stream",
            )

        return resp.json()
    except requests.exceptions.ConnectionError:
        return {"error": "SmartGuide service is unavailable."}
    except Exception as exc:
        logger.exception("SmartGuide chat proxy error")
        return {"error": str(exc)}

@router.post("/chat/clear", auth=django_auth)
def proxy_clear_session(request, data: SessionClearSchema):
    """Clear the SmartGuide conversation session from Redis."""
    return _forward("POST", "/chat/clear", data.dict())

@router.get("/chat/new-session", auth=django_auth)
def proxy_new_session(request):
    """Generate a fresh session ID for a new mock-interview chat."""
    return _forward("GET", "/chat/new-session")

@router.get("/health")
def proxy_health(request):
    """Check SmartGuide microservice health (no auth required)."""
    return _forward("GET", "/health")

# ─── RAG / Ingest endpoints ───────────────────────────────────────────────────

@router.post("/ingest", auth=django_auth)
def proxy_ingest(request, data: IngestRequestSchema):
    """
    Ingest study material chunks into the RAG vector store for a given domain.
    """
    return _forward("POST", "/ingest", data.dict())

@router.get("/ingest/stats", auth=django_auth)
def proxy_ingest_stats(request):
    """Return chunk counts for all knowledge base collections."""
    return _forward("GET", "/ingest/stats")

@router.get("/ingest/stats/{domain}", auth=django_auth)
def proxy_ingest_domain_stats(request, domain: str):
    """Return chunk count for a specific domain's knowledge base."""
    return _forward("GET", f"/ingest/stats/{domain}")
