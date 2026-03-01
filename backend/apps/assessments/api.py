from ninja import Router, Schema
from typing import List, Optional
from django.shortcuts import get_object_or_404
from apps.assessments.models import AssessmentAttempt, AssessmentQuestion, Question, Subject
from ninja.security import django_auth
import logging
import uuid
import random

logger = logging.getLogger(__name__)

router = Router()

class AssessmentStartSchema(Schema):
    domain: str

class QuestionSchema(Schema):
    id: uuid.UUID
    text: str
    options: List[str]
    # No correct answer here, obviously!

class AssessmentResponseSchema(Schema):
    attempt_id: uuid.UUID
    questions: List[QuestionSchema]
    message: str

class SubmitAnswerSchema(Schema):
    question_id: uuid.UUID
    answer: str

class AssessmentSubmissionSchema(Schema):
    attempt_id: uuid.UUID
    answers: List[SubmitAnswerSchema]

class AssessmentResultSchema(Schema):
    attempt_id: uuid.UUID
    domain: str
    date: str
    score: int
    total: int
    percentage: float
    feedback: str

class ReadinessDomainScoreSchema(Schema):
    domain: str
    count: int
    avg_percentage: float

class OverallReadinessSchema(Schema):
    overall_score: float
    assessments_analyzed: int
    readiness_report: str
    key_recommendations: List[str] = []
    domain_performance: List[ReadinessDomainScoreSchema] = []
    service_ready: float = 0.0
    product_ready: float = 0.0
    faang_ready: float = 0.0
    error: Optional[str] = None

class ReadinessHistoryPoint(Schema):
    date: str
    score: float
    domain: str

class LatestAssessmentSchema(Schema):
    domain: Optional[str] = None
    attempt_no: int = 0
    date: Optional[str] = None
    report_generated_on: Optional[str] = None

class StatsSchema(Schema):
    total_finished: int
    average_score: float
    rank: int
    total_participants: int

# Define static rules for domains
# Format: {domain: [(subject_name, difficulty, count), ...]}
# Trying to mix and match to get 50 questions total.
# Since we only imported about 30 questions per subject (10 easy, 10 mod, 10 hard), 
# we need to be careful not to ask for more than available.
# The user asked for 50. Some subjects might have more.
# Let's adjust counts to try to hit 50, but fallback if not enough questions.
DOMAIN_RULES = {
    'Data Engineering': [
        ('Data_Engineering', 'difficult', 5),
        ('Data_Engineering', 'moderate', 5),
        ('Data_Engineering', 'easy', 5),
        ('DSA', 'moderate', 5),
        ('DSA', 'easy', 5),
        ('Data_Science', 'moderate', 5),
        ('Cloud', 'easy', 5),
        ('ML_AI', 'easy', 5),
        ('Networking', 'easy', 5),
        ('Cyber_Security', 'easy', 5)
    ],
    'Cloud / DevOps': [
        ('Cloud', 'difficult', 5),
        ('Cloud', 'moderate', 5),
        ('DevOps', 'difficult', 5),
        ('DevOps', 'moderate', 5),
        ('Networking', 'moderate', 5),
        ('Networking', 'easy', 5),
        ('Cyber_Security', 'easy', 5),
        ('Data_Engineering', 'easy', 5),
        ('Full_Stack', 'easy', 5),
        ('DSA', 'easy', 5)
    ],
    'Embedded Engineer': [
        ('Embedded_Systems', 'difficult', 5),
        ('Embedded_Systems', 'moderate', 10),
        ('Electronics', 'moderate', 10),
        ('Electronics', 'easy', 10),
        ('Networking', 'easy', 5),
        ('Cyber_Security', 'easy', 5),
        ('DSA', 'easy', 5)
    ],
    'AI / ML': [
        ('ML_AI', 'difficult', 5),
        ('ML_AI', 'moderate', 10),
        ('Data_Science', 'moderate', 10),
        ('Data_Science', 'easy', 5),
        ('DSA', 'moderate', 5),
        ('Cloud', 'easy', 5),
        ('Data_Engineering', 'easy', 5),
        ('Full_Stack', 'easy', 5)
    ],
    'Full Stack': [
        ('Full_Stack', 'difficult', 5),
        ('Full_Stack', 'moderate', 10),
        ('Cloud', 'easy', 5),
        ('Data_Science', 'easy', 5),
        ('DevOps', 'easy', 5),
        ('Networking', 'easy', 5),
        ('Cyber_Security', 'easy', 5),
        ('DSA', 'easy', 10)
    ],
    'Data Science': [ # Added generic
        ('Data_Science', 'difficult', 10),
        ('Data_Science', 'moderate', 10),
        ('ML_AI', 'moderate', 10),
        ('ML_AI', 'easy', 10),
        ('Data_Engineering', 'easy', 10)
    ],
    'Cyber Security': [
        ('Cyber_Security', 'difficult', 10),
        ('Cyber_Security', 'moderate', 10),
        ('Networking', 'moderate', 10),
        ('Networking', 'easy', 10),
        ('Cloud', 'easy', 10)
    ]
}

@router.get("/domains", response=List[str], auth=django_auth)
def list_domains(request):
    return list(DOMAIN_RULES.keys())

@router.post("/start", response=AssessmentResponseSchema, auth=django_auth)
def start_assessment(request, data: AssessmentStartSchema):
    domain = data.domain
    logger.info(f"User {request.user.email} starting assessment for domain: {domain}")
    rules = DOMAIN_RULES.get(domain, [])
    
    # If no rules found, maybe default to random mix? 
    # For now, return error or empty if domain not valid.
    if not rules:
        # Fallback: simple random selection from all subjects
        # Or just pick 50 random questions from DB if domain not found
        pass

    selected_questions = []
    seen_ids = set()

    for subj_name, difficulty, count in rules:
        qs = Question.objects.filter(subject__name=subj_name, difficulty=difficulty).exclude(id__in=seen_ids).order_by('?')[:count]
        logger.debug(f"Selected {qs.count()} {difficulty} questions for {subj_name}")
        for q in qs:
            selected_questions.append(q)
            seen_ids.add(q.id)
            
    # If we didn't reach 50, fill up with random questions from related subjects or any subject
    if len(selected_questions) < 50:
        needed = 50 - len(selected_questions)
        # Try to find questions from same subjects first
        subject_names = [r[0] for r in rules]
        qs = Question.objects.filter(subject__name__in=subject_names).exclude(id__in=seen_ids).order_by('?')[:needed]
        for q in qs:
            selected_questions.append(q)
            seen_ids.add(q.id)
    
    # If still not enough, global fallback
    if len(selected_questions) < 50:
        needed = 50 - len(selected_questions)
        qs = Question.objects.exclude(id__in=seen_ids).order_by('?')[:needed]
        for q in qs:
            selected_questions.append(q) # list of Question objects

    # Create Attempt
    attempt = AssessmentAttempt.objects.create(
        user=request.user,
        domain=domain,
        total_questions=len(selected_questions)
    )

    # Create AssessmentQuestion entries
    # Use bulk_create for efficiency
    aq_list = [AssessmentQuestion(attempt=attempt, question=q) for q in selected_questions]
    AssessmentQuestion.objects.bulk_create(aq_list)

    logger.info(f"Assessment {attempt.id} created with {len(selected_questions)} questions")
    return {
        "attempt_id": attempt.id,
        "questions": selected_questions,
        "message": f"Assessment started for {domain} with {len(selected_questions)} questions."
    }

@router.post("/submit", response=AssessmentResultSchema, auth=django_auth)
def submit_assessment(request, data: AssessmentSubmissionSchema):
    logger.info(f"Submitting assessment {data.attempt_id} for user {request.user.email}")
    attempt = get_object_or_404(AssessmentAttempt, id=data.attempt_id, user=request.user)
    
    if attempt.completed_at:
        logger.warning(f"Attempt to resubmit already completed assessment: {data.attempt_id}")
        return 400, {"message": "Assessment already submitted"}

    score = 0
    # Map answers
    answer_map = {a.question_id: a.answer for a in data.answers}
    
    aqs = AssessmentQuestion.objects.filter(attempt=attempt).select_related('question')
    
    for aq in aqs:
        user_ans = answer_map.get(aq.question.id)
        if user_ans:
            aq.user_answer = user_ans
            # Simple exact match check. 
            # Note: stored correct_answer in DB is string. User answer is string.
            if user_ans.strip() == aq.question.correct_answer.strip():
                aq.is_correct = True
                score += 1
            else:
                aq.is_correct = False
            aq.save()
    
    attempt.score = score
    from django.utils import timezone
    attempt.completed_at = timezone.now()
    attempt.save()
    
    percentage = (score / attempt.total_questions) * 100 if attempt.total_questions > 0 else 0
    
    # Feedback logic
    if percentage >= 90:
        feedback = "Outstanding! You have a strong command of this domain."
    elif percentage >= 75:
        feedback = "Great job! You have good knowledge, just a few areas to polish."
    elif percentage >= 50:
        feedback = "Good effort. You have foundational knowledge but need more practice."
    else:
        feedback = "You need to focus on the basics and study more. Don't give up!"

    return {
        "attempt_id": attempt.id,
        "domain": attempt.domain,
        "date": attempt.completed_at.strftime('%Y-%m-%d'),
        "score": score,
        "total": attempt.total_questions,
        "percentage": percentage,
        "feedback": feedback
    }

@router.get("/history", response=List[AssessmentResultSchema], auth=django_auth)
def history(request):
    attempts = AssessmentAttempt.objects.filter(user=request.user, completed_at__isnull=False).order_by('-completed_at')
    results = []
    for a in attempts:
        percentage = (a.score / a.total_questions) * 100 if a.total_questions > 0 else 0
        if percentage >= 90:
            feedback = "Outstanding!"
        elif percentage >= 75:
            feedback = "Great job!"
        elif percentage >= 50:
            feedback = "Good effort."
        else:
            feedback = "Keep practicing."
            
        results.append({
            "attempt_id": a.id,
            "domain": a.domain,
            "date": a.completed_at.strftime('%Y-%m-%d'),
            "score": a.score,
            "total": a.total_questions,
            "percentage": percentage,
            "feedback": feedback
        })
    return results

@router.get("/stats", response=StatsSchema, auth=django_auth)
def get_stats(request):
    user_attempts = AssessmentAttempt.objects.filter(user=request.user, completed_at__isnull=False)
    total_finished = user_attempts.count()

    # Calculate Rank and Participants first
    all_attempts = AssessmentAttempt.objects.filter(completed_at__isnull=False)
    user_scores = {}
    for a in all_attempts:
        if a.user_id not in user_scores:
            user_scores[a.user_id] = []
        if a.total_questions > 0:
            user_scores[a.user_id].append((a.score / a.total_questions) * 100)

    user_averages = []
    for uid, scores in user_scores.items():
        user_avg = sum(scores) / len(scores)
        user_averages.append((uid, user_avg))
    
    # Sort descending
    user_averages.sort(key=lambda x: x[1], reverse=True)

    total_participants = len(user_averages)

    if total_finished == 0:
        return {
            "total_finished": 0,
            "average_score": 0.0,
            "rank": 0,
            "total_participants": total_participants
        }

    # Calculate user's average percentage
    percentages = []
    for a in user_attempts:
        if a.total_questions > 0:
            percentages.append((a.score / a.total_questions) * 100)
    
    avg_score = sum(percentages) / len(percentages) if percentages else 0.0

    # Find rank
    rank = 1
    for uid, u_avg in user_averages:
        if uid == request.user.id:
            break
        rank += 1
    
    return {
        "total_finished": total_finished,
        "average_score": round(avg_score, 1),
        "rank": rank,
        "total_participants": total_participants
    }

class QuestionReportSchema(Schema):
    id: uuid.UUID
    text: str
    options: List[str]
    user_answer: Optional[str] = None
    correct_answer: str
    is_correct: bool

class AssessmentReportSchema(Schema):
    attempt_id: uuid.UUID
    domain: str
    date: str
    score: int
    total: int
    percentage: float
    feedback: str
    questions: List[QuestionReportSchema]

@router.get("/report/{attempt_id}", response=AssessmentReportSchema, auth=django_auth)
def get_assessment_report(request, attempt_id: uuid.UUID):
    attempt = get_object_or_404(AssessmentAttempt, id=attempt_id, user=request.user)
    
    percentage = (attempt.score / attempt.total_questions) * 100 if attempt.total_questions > 0 else 0
    if percentage >= 90:
        feedback = "Outstanding! You have a strong command of this domain."
    elif percentage >= 75:
        feedback = "Great job! You have good knowledge, just a few areas to polish."
    elif percentage >= 50:
        feedback = "Good effort. You have foundational knowledge but need more practice."
    else:
        feedback = "You need to focus on the basics and study more. Don't give up!"

    questions_data = []
    aqs = AssessmentQuestion.objects.filter(attempt=attempt).select_related('question')
    
    for aq in aqs:
        questions_data.append({
            "id": aq.question.id,
            "text": aq.question.text,
            "options": aq.question.options,
            "user_answer": aq.user_answer,
            "correct_answer": aq.question.correct_answer,
            "is_correct": aq.is_correct
        })


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
    prep_plan: List[dict] = []
    error: Optional[str] = None


@router.get("/{attempt_id}/ai-feedback", response=AIFeedbackSchema, auth=django_auth)
def get_ai_feedback(request, attempt_id: uuid.UUID):
    """Proxy to SmartGuide /feedback — sends complete per-question Q&A data."""
    import httpx
    import os as _os

    attempt = get_object_or_404(AssessmentAttempt, id=attempt_id, user=request.user)

    if not attempt.completed_at:
        return 400, {"error": "Assessment not completed yet."}

    aqs = (
        AssessmentQuestion.objects
        .filter(attempt=attempt)
        .select_related("question__subject")
        .order_by("id")
    )

    wrong_answers = []
    correct_answers = []
    weak_subjects: set = set()
    strong_subjects: set = set()

    for aq in aqs:
        q = aq.question
        try:
            subj_name = q.subject.name if q.subject_id else None
        except Exception:
            subj_name = None

        detail = {
            "question": q.text or "",
            "options": q.options if isinstance(q.options, list) else [],
            "user_answer": aq.user_answer,
            "correct_answer": q.correct_answer or "",
            "is_correct": bool(aq.is_correct),
            "subject": subj_name,
            "difficulty": q.difficulty if hasattr(q, "difficulty") else None,
        }

        if aq.is_correct:
            correct_answers.append(detail)
            if subj_name:
                strong_subjects.add(subj_name)
        else:
            wrong_answers.append(detail)
            if subj_name:
                weak_subjects.add(subj_name)

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
        "wrong_answers": wrong_answers,
        "correct_answers": correct_answers,
    }

    try:
        response = httpx.post(
            f"{smartguide_url}/feedback",
            json=payload,
            timeout=60.0,
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
            "prep_plan": data.get("prep_plan", []),
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

@router.get("/latest-summary", response=LatestAssessmentSchema, auth=django_auth)
def get_latest_summary(request):
    attempts = AssessmentAttempt.objects.filter(user=request.user, completed_at__isnull=False).order_by('-completed_at')
    latest = attempts.first()
    count = attempts.count()
    
    if not latest:
        return {
            "domain": "N/A",
            "attempt_no": 0,
            "date": "N/A",
            "report_generated_on": "N/A"
        }
    
    return {
        "domain": latest.domain,
        "attempt_no": count,
        "date": latest.started_at.strftime('%Y-%m-%d'),
        "report_generated_on": latest.completed_at.strftime('%Y-%m-%d %H:%M')
    }

@router.get("/overall-readiness", response=OverallReadinessSchema, auth=django_auth)
def get_overall_readiness(request):
    """Consolidate all assessment results and get a holistic readiness report from SmartGuide."""
    import httpx
    import os as _os
    from django.db.models import Avg, Count
    
    attempts = AssessmentAttempt.objects.filter(user=request.user, completed_at__isnull=False)
    
    if not attempts.exists():
        return {
            "overall_score": 0.0,
            "assessments_analyzed": 0,
            "readiness_report": "You haven't completed any assessments yet. Take a few tests to see your overall readiness!",
            "key_recommendations": ["Start your first assessment in any domain."],
            "domain_performance": []
        }
    
    # Calculate domain performance
    domain_stats = (
        attempts.values('domain')
        .annotate(
            avg_percentage=Avg('score') * 100.0 / Avg('total_questions'),
            count=Count('id')
        )
        .order_by('-avg_percentage')
    )
    
    domain_performance = [
        ReadinessDomainScoreSchema(
            domain=d['domain'],
            count=d['count'],
            avg_percentage=round(d['avg_percentage'], 1)
        ) for d in domain_stats
    ]
    
    total_percentage = sum(d.avg_percentage for d in domain_performance) / len(domain_performance)
    
    # Calculate Company Specific Readiness (Heuristics)
    # Service: Generalist (often slightly higher than raw avg as requirements are broad)
    service_ready = min(100.0, total_percentage * 1.1) 
    
    # Product: Higher bar on Core CS / Specialized skills
    # We factor it down to represent the difficulty jump
    product_ready = total_percentage * 0.85 
    
    # FAANG: Extreme bar on DSA and scalability
    faang_ready = total_percentage * 0.65
    
    # Prepare payload for SmartGuide
    smartguide_url = _os.environ.get("SMARTGUIDE_URL", "http://localhost:8080")
    student_name = request.user.get_full_name() or request.user.username
    
    payload = {
        "student_name": student_name,
        "total_assessments": attempts.count(),
        "overall_average": round(total_percentage, 1),
        "domain_breakdown": [d.dict() for d in domain_performance],
        "request_type": "overall_readiness"
    }
    
    try:
        response = httpx.post(
            f"{smartguide_url}/readiness",
            json=payload,
            timeout=60.0,
        )
        response.raise_for_status()
        data = response.json()
        
        return {
            "overall_score": round(total_percentage, 1),
            "assessments_analyzed": attempts.count(),
            "readiness_report": data.get("overall_summary", "Analysis complete."),
            "key_recommendations": data.get("priority_topics", []),
            "domain_performance": domain_performance,
            "service_ready": round(service_ready, 1),
            "product_ready": round(product_ready, 1),
            "faang_ready": round(faang_ready, 1)
        }
    except Exception as exc:
        return {
            "overall_score": round(total_percentage, 1),
            "assessments_analyzed": attempts.count(),
            "readiness_report": "SmartGuide analysis is currently unavailable, but here is your basic breakdown.",
            "key_recommendations": ["Try again later for AI-powered suggestions."],
            "domain_performance": domain_performance,
            "service_ready": round(service_ready, 1),
            "product_ready": round(product_ready, 1),
            "faang_ready": round(faang_ready, 1),
            "error": str(exc)
        }

@router.get("/readiness-history", response=List[ReadinessHistoryPoint], auth=django_auth)
def get_readiness_history(request):
    """Returns a time-series of readiness score progression."""
    attempts = AssessmentAttempt.objects.filter(user=request.user, completed_at__isnull=False).order_by('completed_at')
    
    history = []
    domain_best_scores = {}
    
    for attempt in attempts:
        percentage = (attempt.score / attempt.total_questions * 100) if attempt.total_questions > 0 else 0
        
        # Update best score for this domain
        current_best = domain_best_scores.get(attempt.domain, 0)
        if percentage > current_best:
            domain_best_scores[attempt.domain] = percentage
            
        # Cumulative readiness: average of current best scores across all unique domains tested so far
        avg_readiness = sum(domain_best_scores.values()) / len(domain_best_scores)
        
        history.append({
            "date": attempt.completed_at.strftime('%Y-%m-%d'),
            "score": round(avg_readiness, 1),
            "domain": attempt.domain
        })
        
    return history
