"""Pydantic schemas for the /chat endpoint."""
from pydantic import BaseModel, Field
from typing import List, Literal, Optional


class ChatMessage(BaseModel):
    role: Literal["user", "assistant", "system"]
    content: str


class ChatRequest(BaseModel):
    session_id: str = Field(..., description="Unique session ID for multi-turn memory")
    message: str = Field(..., description="User's current message")
    context: Optional[str] = Field(
        default=None,
        description="Optional context hint, e.g. 'Data Engineering mock interview'"
    )
    stream: bool = Field(default=True, description="Stream tokens via SSE")


class ChatResponse(BaseModel):
    """Used only for non-streaming responses."""
    session_id: str
    reply: str
    history_length: int


class SessionClearRequest(BaseModel):
    session_id: str
