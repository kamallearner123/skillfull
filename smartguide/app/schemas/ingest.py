"""Pydantic schemas for the /ingest endpoint."""
from pydantic import BaseModel, Field
from typing import List, Optional


class DocumentChunk(BaseModel):
    text: str = Field(..., min_length=10, description="The text content of this chunk")
    source: Optional[str] = Field(default=None, description="Source name, e.g. filename or URL")
    topic: Optional[str] = Field(default=None, description="Topic tag, e.g. 'Kafka', 'SQL'")


class IngestRequest(BaseModel):
    domain: str = Field(..., description="Target placement domain, e.g. 'Data Engineering'")
    chunks: List[DocumentChunk] = Field(..., min_length=1, description="List of text chunks to store")


class IngestResponse(BaseModel):
    domain: str
    chunks_ingested: int
    collection_total: int
    message: str


class CollectionStatsResponse(BaseModel):
    collections: List[dict]
