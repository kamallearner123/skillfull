import logging
import json
from fastapi import APIRouter, HTTPException
from app.schemas.readiness import ReadinessInput, ReadinessResponse
from app.services.llm_service import get_llm_backend
from app.services.prompt_builder import READINESS_SYSTEM, build_readiness_prompt
from app.utils import parse_llm_json

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/readiness", tags=["Readiness"])

# Using parse_llm_json from app.utils

@router.post("", response_model=ReadinessResponse, summary="Analyze overall student readiness")
async def analyze_readiness(data: ReadinessInput):
    logger.info(f"Readiness analysis request for {data.student_name} | Avg: {data.overall_average}%")
    llm = get_llm_backend()
    
    user_message = build_readiness_prompt(data)
    
    try:
        raw = await llm.generate(
            system_prompt=READINESS_SYSTEM,
            history=[],
            user_message=user_message,
        )
    except Exception as exc:
        logger.error(f"LLM inference failed for readiness request: {exc}")
        raise HTTPException(status_code=503, detail=f"LLM inference error: {exc}")

    try:
        parsed = parse_llm_json(raw)
        return ReadinessResponse(
            overall_summary=parsed.get("overall_summary", "Analysis complete."),
            priority_topics=parsed.get("priority_topics", [])
        )
    except Exception as exc:
        logger.error("Failed to parse LLM JSON for readiness")
        raise HTTPException(status_code=502, detail="LLM returned malformed JSON")
