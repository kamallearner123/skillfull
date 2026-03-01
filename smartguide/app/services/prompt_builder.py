"""
SmartGuide — Prompt Builder
Constructs structured, context-rich prompts for each of the three API endpoints.
All prompts follow the Mistral/Llama instruct chat format (system + user messages).

RAG support: when retrieved_chunks are provided, they are injected into the
prompt as a "Relevant Knowledge Base Excerpts" block before the main instruction.
This allows the LLM to ground its response in actual course/study material.
"""
from typing import List, Optional

from app.schemas.feedback import AssessmentInput
from app.schemas.schedule import ScheduleRequest
from app.schemas.readiness import ReadinessInput


# ─── System persona ────────────────────────────────────────────────────────────

SMARTGUIDE_PERSONA = (
    "You are SmartGuide, an expert AI placement coach helping engineering students "
    "prepare for campus recruitment, written tests, and technical interviews. "
    "You give precise, actionable, and encouraging advice. "
    "When asked for JSON output, respond ONLY with valid JSON and nothing else."
)

MOCK_INTERVIEW_PERSONA = (
    "You are SmartGuide, acting as a senior technical interviewer. "
    "Ask one question at a time, evaluate the student's answers constructively, "
    "give brief hints when the student is stuck, and guide them toward the right answer. "
    "Be professional yet encouraging."
)


# ─── RAG context block ────────────────────────────────────────────────────────

RAG_CONTEXT_HEADER = (
    "## Relevant Knowledge Base Excerpts\n"
    "The following excerpts have been retrieved from the platform's study material "
    "and are directly relevant to this student's domain and weak topics. "
    "Use them to ground your response in specific, accurate information:\n\n"
)


def _format_rag_block(chunks: List[str]) -> str:
    """Format retrieved chunks into a numbered excerpt block."""
    if not chunks:
        return ""
    lines = [RAG_CONTEXT_HEADER]
    for i, chunk in enumerate(chunks, 1):
        lines.append(f"[{i}] {chunk.strip()}")
    lines.append("\n---\n")
    return "\n".join(lines)


# ─── Feedback prompt ──────────────────────────────────────────────────────────

FEEDBACK_SYSTEM = SMARTGUIDE_PERSONA + (
    "\n\nYou will receive assessment data and must respond ONLY with a JSON object "
    "matching this exact schema:\n"
    "{\n"
    '  "overall_summary": "<2-3 sentence performance summary>",\n'
    '  "strengths": ["<specific strength based on correct answers>", ...],\n'
    '  "improvement_areas": ["<specific area based on wrong answers>", ...],\n'
    '  "priority_topics": ["<topic>", ...],\n'
    '  "suggested_resources": [\n'
    '    {"title": "<string>", "url": "<url>", "type": "<article|video|course|documentation>"},\n'
    '    ...\n'
    "  ],\n"
    '  "motivational_note": "<encouraging closing message>",\n'
    '  "prep_plan": [\n'
    '    {\n'
    '      "topic": "<specific topic/concept to study>",\n'
    '      "hours_needed": <integer — realistic study hours 1-20>,\n'
    '      "priority": "<high|medium|low>",\n'
    '      "what_to_study": "<concrete actions: e.g. revise X, do Y practice problems, watch Z video>",\n'
    '      "resources": ["<resource title or url>", ...]\n'
    '    },\n'
    '    ...\n'
    '  ]\n'
    "}\n"
    "Rules for prep_plan:\n"
    "- Include one entry per weak topic/subject identified from the wrong answers.\n"
    "- hours_needed must be a realistic integer (e.g. 2, 4, 6, 8) based on difficulty.\n"
    "- what_to_study must be specific and actionable, not generic.\n"
    "- Do NOT output anything outside the JSON object.\n"
)


def build_feedback_prompt(data: AssessmentInput, retrieved_chunks: Optional[List[str]] = None) -> str:
    """Return the user-turn message for the feedback endpoint.

    Args:
        data:             The student's assessment result.
        retrieved_chunks: Optional RAG chunks to ground the response.
    """
    weak = ", ".join(data.weak_topics) if data.weak_topics else "None identified"
    strong = ", ".join(data.strong_topics) if data.strong_topics else "None identified"
    rag_block = _format_rag_block(retrieved_chunks or [])

    # Build wrong answers section — at most 15 to keep prompt size reasonable
    wrong_block = ""
    if data.wrong_answers:
        lines = ["\n## Questions Answered INCORRECTLY\n"]
        for i, q in enumerate(data.wrong_answers[:15], 1):
            lines.append(f"{i}. Q: {q.question}")
            if q.options:
                lines.append(f"   Options: {', '.join(q.options)}")
            lines.append(f"   Student answered: {q.user_answer or '(no answer)'}")
            lines.append(f"   Correct answer:   {q.correct_answer}")
            if q.subject:
                diff = f" [{q.difficulty}]" if q.difficulty else ""
                lines.append(f"   Subject: {q.subject}{diff}")
            lines.append("")
        if len(data.wrong_answers) > 15:
            lines.append(f"   ...and {len(data.wrong_answers) - 15} more incorrect questions.")
        wrong_block = "\n".join(lines)

    # Build correct answers section — summarise by subject only
    correct_block = ""
    if data.correct_answers:
        correct_block = f"\n## Questions Answered CORRECTLY: {len(data.correct_answers)} out of {data.total}\n"

    return (
        f"{rag_block}"
        f"Student Name: {data.student_name}\n"
        f"Domain: {data.domain}\n"
        f"Score: {data.score}/{data.total} ({data.percentage:.1f}%)\n"
        f"Strong Topics: {strong}\n"
        f"Weak Topics: {weak}\n"
        f"{wrong_block}"
        f"{correct_block}\n"
        "Based on the specific wrong answers above, provide detailed, personalised "
        "placement-focused feedback. Identify exactly WHICH concepts the student is "
        "confused about, and list those as priority topics. "
        "Respond ONLY with the JSON schema above."
    )



# ─── Schedule prompt ──────────────────────────────────────────────────────────

SCHEDULE_SYSTEM = SMARTGUIDE_PERSONA + (
    "\n\nYou will receive a schedule request and must respond ONLY with a JSON object "
    "matching this exact schema:\n"
    "{\n"
    '  "overall_strategy": "<string: 2-3 sentences>",\n'
    '  "plan": [\n'
    "    {\n"
    '      "date": "<YYYY-MM-DD>",\n'
    '      "day_label": "<e.g. Day 1 — Topic Name>",\n'
    '      "topic": "<string>",\n'
    '      "tasks": [\n'
    '        {"title": "<string>", "description": "<string>", "estimated_minutes": <int>, "resource_url": "<string|null>"}\n'
    "      ],\n"
    '      "total_hours": <float>\n'
    "    }\n"
    "  ]\n"
    "}\n"
    "Cover all weak topics across the available days. "
    "Interleave revision days every 3-4 new-topic days. "
    "Do not output anything outside the JSON object."
)


def build_schedule_prompt(req: ScheduleRequest, retrieved_chunks: Optional[List[str]] = None) -> str:
    """Return the user-turn message for the schedule endpoint.

    Args:
        req:              The schedule request.
        retrieved_chunks: Optional RAG chunks for topic context.
    """
    weak = ", ".join(req.weak_topics) if req.weak_topics else "general revision"
    strong = ", ".join(req.strong_topics) if req.strong_topics else "None"
    rag_block = _format_rag_block(retrieved_chunks or [])
    return (
        f"{rag_block}"
        f"Student: {req.student_name}\n"
        f"Domain: {req.domain}\n"
        f"Goal: {req.goal}\n"
        f"Target Date: {req.target_date}\n"
        f"Available Hours/Day: {req.available_hours_per_day}\n"
        f"Weak Topics (must cover): {weak}\n"
        f"Strong Topics (review only): {strong}\n\n"
        "Generate a practical day-by-day preparation schedule in the JSON schema above."
    )


# ─── Chat / Mock Interview prompt ─────────────────────────────────────────────

def build_chat_system_prompt(context: str | None, retrieved_chunks: Optional[List[str]] = None) -> str:
    """Build the system prompt for the mock-interview chat.

    Optionally injects RAG chunks into the system prompt so the interviewer
    can ask questions grounded in the platform's study material.
    """
    base = MOCK_INTERVIEW_PERSONA
    if context:
        base += f"\n\nSession context: {context}"
    if retrieved_chunks:
        rag_block = _format_rag_block(retrieved_chunks)
        base += f"\n\nUse the following excerpts as a source of questions and discussion topics:\n{rag_block}"
    return base


# ─── Overall Readiness prompt ─────────────────────────────────────────────────

READINESS_SYSTEM = SMARTGUIDE_PERSONA + (
    "\n\nYou will receive a summary of a student's performance across multiple assessment domains "
    "and must respond ONLY with a JSON object matching this exact schema:\n"
    "{\n"
    '  "overall_summary": "<2-3 sentence performance summary across all domains>",\n'
    '  "priority_topics": ["<topic to focus on across any domain>", ...]\n'
    "}\n"
    "Analyze the domain breakdown to identify if the student is consistently strong "
    "or has specific architectural/fundamental gaps across domains."
    "Do NOT output anything outside the JSON object."
)


def build_readiness_prompt(data: ReadinessInput) -> str:
    """Return the user-turn message for the readiness endpoint."""
    domain_lines = []
    for d in data.domain_breakdown:
        domain_lines.append(f"- {d.domain}: {d.avg_percentage:.1f}% (over {d.count} assessments)")
    
    breakdown_text = "\n".join(domain_lines)
    
    return (
        f"Student Name: {data.student_name}\n"
        f"Total Assessments Taken: {data.total_assessments}\n"
        f"Overall Average Score: {data.overall_average:.1f}%\n"
        f"Domain Breakdown:\n{breakdown_text}\n\n"
        "Provide a high-level summary of the student's overall placement readiness "
        "and list the top 3-5 priority topics they should study next to improve their "
        "standing across these domains."
    )
