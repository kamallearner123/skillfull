from ninja import Router, Schema
from typing import List, Optional
from django.shortcuts import get_object_or_404
from apps.assessments.models import AssessmentAttempt, AssessmentQuestion, Question, Subject
from ninja.security import django_auth
import uuid
import random

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

    return {
        "attempt_id": attempt.id,
        "questions": selected_questions,
        "message": f"Assessment started for {domain} with {len(selected_questions)} questions."
    }

@router.post("/submit", response=AssessmentResultSchema, auth=django_auth)
def submit_assessment(request, data: AssessmentSubmissionSchema):
    attempt = get_object_or_404(AssessmentAttempt, id=data.attempt_id, user=request.user)
    
    if attempt.completed_at:
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
