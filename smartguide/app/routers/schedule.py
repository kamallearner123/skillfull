"""
SmartGuide — /schedule router
Generates a personalised day-by-day study schedule using the LLM.
"""
import json
import logging
from datetime import date

from fastapi import APIRouter, HTTPException

from app.config import settings
from app.schemas.schedule import DailyTask, DayPlan, ScheduleRequest, ScheduleResponse
from app.services import rag_service
from app.services.llm_service import get_llm_backend
from app.services.prompt_builder import SCHEDULE_SYSTEM, build_schedule_prompt
from app.utils import parse_llm_json

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/schedule", tags=["Schedule"])


# Using parse_llm_json from app.utils


def _count_days(target: str) -> int:
    """Count days from today to the target date (inclusive lower bound)."""
    try:
        target_dt = date.fromisoformat(target)
        delta = (target_dt - date.today()).days
        return max(delta, 1)
    except ValueError:
        return 30  # fallback


@router.post("", response_model=ScheduleResponse, summary="Generate a personalised study schedule")
async def generate_schedule(req: ScheduleRequest):
    """
    Accepts a student's weak topics, target date, and available hours,
    and returns a detailed day-by-day preparation calendar.
    """
    llm = get_llm_backend()

    # ── RAG: retrieve topic-relevant study material ────────────────────────────
    retrieved_chunks: list[str] = []
    if settings.RAG_ENABLED:
        rag_query = f"{req.domain} preparation: {', '.join(req.weak_topics)}" if req.weak_topics else f"{req.domain} study plan"
        retrieved_chunks = rag_service.retrieve_context(
            domain=req.domain,
            query=rag_query,
            top_k=settings.RAG_TOP_K,
        )
        logger.info("RAG: retrieved %d chunks for domain '%s'", len(retrieved_chunks), req.domain)

    user_message = build_schedule_prompt(req, retrieved_chunks=retrieved_chunks)

    try:
        raw = await llm.generate(
            system_prompt=SCHEDULE_SYSTEM,
            history=[],
            user_message=user_message,
        )
    except Exception as exc:
        logger.exception("LLM inference failed for schedule request")
        raise HTTPException(status_code=503, detail=f"LLM inference error: {exc}")

    try:
        parsed = parse_llm_json(raw)
    except Exception as exc:
        logger.error("Failed to parse LLM schedule JSON: %s", exc)
        raise HTTPException(status_code=502, detail="LLM returned malformed JSON")

    plan = []
    for day_raw in parsed.get("plan", []):
        tasks = [
            DailyTask(
                title=t.get("title", "Study"),
                description=t.get("description", ""),
                estimated_minutes=int(t.get("estimated_minutes", 60)),
                resource_url=t.get("resource_url"),
            )
            for t in day_raw.get("tasks", [])
        ]
        plan.append(
            DayPlan(
                date=day_raw.get("date", ""),
                day_label=day_raw.get("day_label", ""),
                topic=day_raw.get("topic", ""),
                tasks=tasks,
                total_hours=float(day_raw.get("total_hours", req.available_hours_per_day)),
            )
        )

    return ScheduleResponse(
        student_name=req.student_name,
        domain=req.domain,
        goal=req.goal,
        start_date=date.today().isoformat(),
        target_date=req.target_date,
        total_days=_count_days(req.target_date),
        plan=plan,
        overall_strategy=parsed.get("overall_strategy", ""),
    )
