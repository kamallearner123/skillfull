"""
SmartGuide — Redis Conversation Memory
Stores per-session chat history as a JSON list with a TTL.
"""
import json
import logging
from typing import List

import redis.asyncio as aioredis

from app.config import settings
from app.schemas.chat import ChatMessage

logger = logging.getLogger(__name__)

# Module-level connection pool (shared across requests)
_redis_client: aioredis.Redis | None = None


def _get_redis() -> aioredis.Redis:
    global _redis_client
    if _redis_client is None:
        _redis_client = aioredis.from_url(
            settings.REDIS_URL,
            encoding="utf-8",
            decode_responses=True,
        )
    return _redis_client


def _session_key(session_id: str) -> str:
    return f"smartguide:session:{session_id}"


async def load_history(session_id: str) -> List[dict]:
    """Return the stored message list for a session (empty list if new)."""
    try:
        client = _get_redis()
        raw = await client.get(_session_key(session_id))
        if raw:
            return json.loads(raw)
    except Exception as exc:
        logger.warning("Redis load_history failed for session %s: %s", session_id, exc)
    return []


async def append_messages(session_id: str, messages: List[ChatMessage]) -> None:
    """Append new messages to the session history and refresh the TTL."""
    try:
        client = _get_redis()
        key = _session_key(session_id)
        current = await load_history(session_id)
        current.extend([m.model_dump() for m in messages])
        await client.setex(key, settings.REDIS_TTL_SECONDS, json.dumps(current))
    except Exception as exc:
        logger.warning("Redis append_messages failed for session %s: %s", session_id, exc)


async def clear_session(session_id: str) -> None:
    """Delete the session history from Redis."""
    try:
        client = _get_redis()
        await client.delete(_session_key(session_id))
    except Exception as exc:
        logger.warning("Redis clear_session failed for session %s: %s", session_id, exc)


async def get_session_length(session_id: str) -> int:
    history = await load_history(session_id)
    return len(history)
