#!/usr/bin/env python3
"""Fix the broken assessments/api.py — removes the literal \\n garbage line and appends clean code."""
import os, py_compile

target = os.path.join(os.path.dirname(__file__), '..', 'apps', 'assessments', 'api.py')
target = os.path.abspath(target)

with open(target, 'r') as f:
    lines = f.readlines()

# Keep lines 0-361 (first 362 lines — everything through the for-loop content)
good = [l for l in lines[:362] if True]

addition = """\

    return {
        "attempt_id": attempt.id,
        "domain": attempt.domain,
        "date": attempt.completed_at.strftime('%Y-%m-%d') if attempt.completed_at else "",
        "score": attempt.score,
        "total": attempt.total_questions,
        "percentage": percentage,
        "feedback": feedback,
        "questions": questions_data
    }


class AIFeedbackSchema(Schema):
    overall_summary: str = ""
    strengths: List[str] = []
    improvement_areas: List[str] = []
    priority_topics: List[str] = []
    suggested_resources: List[dict] = []
    motivational_note: str = ""
    error: Optional[str] = None


@router.get("/{attempt_id}/ai-feedback", response=AIFeedbackSchema, auth=django_auth)
def get_ai_feedback(request, attempt_id: uuid.UUID):
    \"\"\"Proxy to SmartGuide /feedback with weak/strong topic analysis.\"\"\"
    import httpx
    import os as _os

    attempt = get_object_or_404(AssessmentAttempt, id=attempt_id, user=request.user)

    if not attempt.completed_at:
        return 400, {"error": "Assessment not completed yet."}

    aqs = AssessmentQuestion.objects.filter(attempt=attempt).select_related("question__subject")
    weak_subjects = set()
    strong_subjects = set()
    for aq in aqs:
        try:
            subj = aq.question.subject.name if aq.question.subject_id else None
        except Exception:
            subj = None
        if not subj:
            continue
        if aq.is_correct:
            strong_subjects.add(subj)
        else:
            weak_subjects.add(subj)

    weak_topics = list(weak_subjects)
    strong_topics = list(strong_subjects - weak_subjects)

    smartguide_url = _os.environ.get("SMARTGUIDE_URL", "http://localhost:8080")
    student_name = request.user.get_full_name() or request.user.username
    percentage = (attempt.score / attempt.total_questions * 100) if attempt.total_questions else 0

    payload = {
        "attempt_id": str(attempt.id),
        "student_name": student_name,
        "domain": attempt.domain,
        "score": attempt.score,
        "total": attempt.total_questions,
        "percentage": round(percentage, 1),
        "weak_topics": weak_topics,
        "strong_topics": strong_topics,
    }

    try:
        response = httpx.post(
            f"{smartguide_url}/feedback",
            json=payload,
            timeout=30.0,
        )
        response.raise_for_status()
        data = response.json()
        return {
            "overall_summary": data.get("overall_summary", ""),
            "strengths": data.get("strengths", []),
            "improvement_areas": data.get("improvement_areas", []),
            "priority_topics": data.get("priority_topics", []),
            "suggested_resources": data.get("suggested_resources", []),
            "motivational_note": data.get("motivational_note", ""),
            "error": None,
        }
    except Exception as exc:
        return {
            "overall_summary": "",
            "strengths": [],
            "improvement_areas": [],
            "priority_topics": [],
            "suggested_resources": [],
            "motivational_note": "",
            "error": f"SmartGuide unavailable: {str(exc)}",
        }
"""

with open(target, 'w') as f:
    f.writelines(good)
    f.write(addition)

try:
    py_compile.compile(target, doraise=True)
    total = len(open(target).readlines())
    print(f"OK: api.py compiles. {total} lines.")
except py_compile.PyCompileError as e:
    print(f"COMPILE ERROR: {e}")
