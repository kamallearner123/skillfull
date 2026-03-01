"""
SmartGuide — /feedback router
Generates personalised, LLM-based feedback for a completed assessment attempt.
"""
import json
import logging

from fastapi import APIRouter, HTTPException

from app.config import settings
from app.schemas.feedback import AssessmentInput, FeedbackResponse, PrepTopic, Resource
from app.services import rag_service
from app.services.prompt_builder import FEEDBACK_SYSTEM, build_feedback_prompt
from app.utils import parse_llm_json

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/feedback", tags=["Feedback"])


# Using parse_llm_json from app.utils


@router.post("", response_model=FeedbackResponse, summary="Generate AI feedback for an assessment")
async def generate_feedback(data: AssessmentInput):
    """
    Accepts a completed assessment result and returns structured AI feedback:
    - Overall performance summary
    - Strengths & improvement areas
    - Priority topics to study next
    - Curated resource suggestions
    - Motivational closing note
    """
    logger.info(f"Feedback request for attempt {data.attempt_id} | Percentage: {data.percentage}%")
    llm = get_llm_backend()

    # ── RAG: retrieve relevant knowledge base chunks ───────────────────────────
    retrieved_chunks: list[str] = []
    if settings.RAG_ENABLED:
        # Query = domain + comma-joined weak topics for focused retrieval
        rag_query = f"{data.domain}: {', '.join(data.weak_topics)}" if data.weak_topics else data.domain
        retrieved_chunks = rag_service.retrieve_context(
            domain=data.domain,
            query=rag_query,
            top_k=settings.RAG_TOP_K,
        )
        logger.debug(f"Retrieved {len(retrieved_chunks)} chunks from ChromaDB for domain '{data.domain}'")
        for i, chunk in enumerate(retrieved_chunks):
            logger.debug(f"  Chunk {i+1}: {chunk[:100]}...")

    user_message = build_feedback_prompt(data, retrieved_chunks=retrieved_chunks)
    logger.info(f"Built prompt for domain '{data.domain}'")

    try:
        raw = await llm.generate(
            system_prompt=FEEDBACK_SYSTEM,
            history=[],
            user_message=user_message,
        )
        logger.debug(f"LLM RAW Response length: {len(raw)} chars")
    except Exception as exc:
        logger.error(f"LLM inference failed for feedback request: {exc}")
        raise HTTPException(status_code=503, detail=f"LLM inference error: {exc}")

    try:
        parsed = parse_llm_json(raw)
        logger.info(f"Feedback generated successfully for {data.attempt_id}")
    except Exception as exc:
        logger.error("Failed to parse LLM JSON output for feedback")
        raise HTTPException(status_code=502, detail="LLM returned malformed JSON")

    # Build strongly-typed resources list
    resources = [
        Resource(
            title=r.get("title", "Resource"),
            url=r.get("url", "#"),
            type=r.get("type", "article"),
        )
        for r in parsed.get("suggested_resources", [])
    ]

    # Build typed prep_plan
    raw_plan = parsed.get("prep_plan", [])
    prep_plan = []
    for p in raw_plan:
        try:
            prep_plan.append(PrepTopic(
                topic=p.get("topic", ""),
                hours_needed=int(p.get("hours_needed", 2)),
                priority=p.get("priority", "medium"),
                what_to_study=p.get("what_to_study", ""),
                resources=p.get("resources", []),
            ))
        except Exception:
            pass

    return FeedbackResponse(
        attempt_id=data.attempt_id,
        domain=data.domain,
        overall_summary=parsed.get("overall_summary", ""),
        strengths=parsed.get("strengths", []),
        improvement_areas=parsed.get("improvement_areas", []),
        priority_topics=parsed.get("priority_topics", []),
        suggested_resources=resources,
        motivational_note=parsed.get("motivational_note", ""),
        prep_plan=prep_plan,
    )
