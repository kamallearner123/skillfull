"""
SmartGuide — /chat router
Streaming mock-interview chat backed by Redis multi-turn memory.
Responses are streamed via Server-Sent Events (SSE).
"""
import asyncio
import json
import logging
import uuid

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse

from app.config import settings
from app.schemas.chat import ChatMessage, ChatRequest, ChatResponse, SessionClearRequest
from app.services import memory, rag_service
from app.services.llm_service import get_llm_backend
from app.services.prompt_builder import build_chat_system_prompt

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/chat", tags=["Chat"])


async def _sse_event(data: dict) -> str:
    """Format a dict as an SSE data line."""
    return f"data: {json.dumps(data)}\n\n"


@router.post(
    "",
    summary="Mock-interview chat (SSE streaming)",
)
async def chat(req: ChatRequest):
    """
    Multi-turn streaming chat for mock interview practice.

    - Maintains per-session conversation history in Redis.
    - Streams LLM response tokens as Server-Sent Events.
    - Client should read events until `{"done": true}` is received.

    ### SSE Event format
    ```
    data: {"token": "Hello"}
    data: {"token": " world"}
    data: {"done": true, "session_id": "abc123", "history_length": 4}
    ```
    """
    print(f"\n[SMARTGUIDE CHAT REQUEST] Session: {req.session_id} | Message: {req.message} | Stream: {req.stream}")
    llm = get_llm_backend()

    # ── RAG: retrieve relevant excerpts to ground the interviewer's questions ──────
    retrieved_chunks: list[str] = []
    if settings.RAG_ENABLED and req.context:
        # Use the session context (e.g., "Data Structures interview") as the RAG query
        domain_hint = req.context.split(" ")[0] if req.context else "general"
        retrieved_chunks = rag_service.retrieve_context(
            domain=domain_hint,
            query=req.context,
            top_k=settings.RAG_TOP_K,
        )
        print(f"[SMARTGUIDE RAG] Retrieved {len(retrieved_chunks)} chunks from ChromaDB for domain '{domain_hint}'")
        for i, chunk in enumerate(retrieved_chunks):
            print(f"  - Chunk {i+1}: {chunk[:100]}...")

    system_prompt = build_chat_system_prompt(req.context, retrieved_chunks=retrieved_chunks)
    print(f"[SMARTGUIDE PROMPT] System prompt length: {len(system_prompt)} chars")

    # Load existing conversation history from Redis
    history = await memory.load_history(req.session_id)

    async def event_generator():
        full_reply_parts = []
        try:
            async for token in llm.stream(
                system_prompt=system_prompt,
                history=history,
                user_message=req.message,
            ):
                full_reply_parts.append(token)
                yield await _sse_event({"token": token})
        except Exception as exc:
            logger.exception("LLM streaming failed in chat")
            print(f"[SMARTGUIDE CHAT ERROR] {str(exc)}")
            yield await _sse_event({"error": str(exc)})
            return

        full_reply = "".join(full_reply_parts)
        print(f"[SMARTGUIDE CHAT REPLY STREAMED] Message: {full_reply[:50]}...")

        # Persist both the user message and assistant reply to Redis
        new_messages = [
            ChatMessage(role="user", content=req.message),
            ChatMessage(role="assistant", content=full_reply),
        ]
        await memory.append_messages(req.session_id, new_messages)

        history_len = await memory.get_session_length(req.session_id)
        yield await _sse_event(
            {"done": True, "session_id": req.session_id, "history_length": history_len}
        )

    if not req.stream:
        # Non-streaming fallback: collect all tokens and return JSON
        tokens = []
        async for token in llm.stream(system_prompt, history, req.message):
            tokens.append(token)
        full = "".join(tokens)
        print(f"[SMARTGUIDE CHAT REPLY JSON] Message: {full[:50]}...")
        new_msgs = [
            ChatMessage(role="user", content=req.message),
            ChatMessage(role="assistant", content=full),
        ]
        await memory.append_messages(req.session_id, new_msgs)
        return {
            "session_id": req.session_id,
            "reply": full,
            "history_length": await memory.get_session_length(req.session_id),
        }

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",  # Disable Nginx buffering for SSE
        },
    )


@router.post("/clear", summary="Clear session conversation history")
async def clear_session(req: SessionClearRequest):
    """Delete the conversation history for the given session_id from Redis."""
    await memory.clear_session(req.session_id)
    return {"detail": f"Session {req.session_id} cleared."}


@router.get("/new-session", summary="Generate a new unique session ID")
async def new_session():
    """Helper endpoint to generate a fresh session ID for a new mock interview."""
    return {"session_id": str(uuid.uuid4())}
