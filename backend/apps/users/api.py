import logging
import json
import uuid
from typing import List, Optional
from ninja import Router, Schema
from django.contrib.auth import authenticate, login as django_login, logout as django_logout, get_user_model
from ninja.security import django_auth

logger = logging.getLogger(__name__)

User = get_user_model()
router = Router()

class UserSchema(Schema):
    id: uuid.UUID
    username: str
    email: str
    role: str
    name: Optional[str] = None
    avatar: Optional[str] = None
    
    # Student specific fields
    registration_id: Optional[str] = None
    department_name: Optional[str] = None
    graduation_year: Optional[int] = None
    cgpa: Optional[float] = None

class StudentReadinessSchema(Schema):
    id: uuid.UUID
    name: str
    email: str
    readiness_score: float
    service_ready: float
    product_ready: float
    faang_ready: float

class LoginSchema(Schema):
    email: str
    password: str

@router.post("/login", auth=None, response={200: dict, 401: dict})
def login(request, data: LoginSchema):
    logger.info(f"Login attempt for identifier: {data.email}")
    
    # Try to find user by email or username
    identifier = data.email
    user = None
    
    # helper to check if string looks like an email
    if '@' not in identifier:
        # Try to find user by username first
        try:
            user_obj = User.objects.get(username=identifier)
            # If found, use their email for authentication (since USERNAME_FIELD is email)
            user = authenticate(request, username=user_obj.email, password=data.password)
        except User.DoesNotExist:
            # If username not found, let authenticate fail naturally
            pass
            
    if user is None:
        # Standard authentication (treats identifier as the USERNAME_FIELD, i.e., email)
        user = authenticate(request, username=identifier, password=data.password)

    if user is not None:
        logger.info(f"Login successful for user: {user.username} ({user.email})")
        django_login(request, user)
        return {"success": True, "user": {
            "id": str(user.id),
            "username": user.username,
            "email": user.email,
            "role": user.role,
            "name": user.name,
            "avatar": user.avatar,
            "registration_id": user.registration_id,
            "department_name": user.department.name if user.department else None,
            "graduation_year": user.graduation_year if user.graduation_year else None,
            "cgpa": float(user.cgpa) if user.cgpa else None,
        }}
    
    logger.warning(f"Login failed for identifier: {data.email}")
    return 401, {"message": "Invalid credentials"}

@router.post("/logout", auth=None)
def logout(request):
    if request.user.is_authenticated:
        logger.info(f"User logged out: {request.user.username}")
        django_logout(request)
    return {"success": True}

@router.get("/me", response=UserSchema, auth=django_auth)
def me(request):
    logger.debug(f"Fetching current user: {request.user.username} (ID: {request.user.id})")
    user = request.user
    user.department_name = user.department.name if user.department else None
    logger.info(f"User profile retrieved for: {user.email}")
    return user

@router.get("/", response=List[UserSchema], auth=django_auth)
def list_users(request):
    logger.info(f"User list requested by: {request.user.email}")
    if request.user.role != 'SUPER_ADMIN':
        logger.error(f"Unauthorized access attempt to user list by: {request.user.email}")
        # In a real app we'd return 403, but here we'll just filter if needed or return list
        
    users = User.objects.all()
    logger.debug(f"Retrieved {users.count()} users from database")
    for user in users:
        user.department_name = user.department.name if user.department else None
    return users

@router.get("/department-students", response=List[StudentReadinessSchema], auth=django_auth)
def list_department_students(request):
    logger.info(f"Department student list requested by: {request.user.email}")
    if request.user.role not in ['DEPT_ADMIN', 'SUPER_ADMIN']:
        logger.warning(f"Unauthorized access attempt to dept students by: {request.user.email}")
        return 403, {"message": "Unauthorized"}
    
    dept = request.user.department
    if not dept and request.user.role != 'SUPER_ADMIN':
        return []
        
    students = User.objects.filter(role='STUDENT')
    if dept:
        students = students.filter(department=dept)
        
    from apps.assessments.models import AssessmentAttempt
    from django.db.models import Avg
    
    results = []
    for student in students:
        attempts = AssessmentAttempt.objects.filter(user=student, completed_at__isnull=False)
        if attempts.exists():
            domain_stats = (
                attempts.values('domain')
                .annotate(
                    avg_percentage=Avg('score') * 100.0 / Avg('total_questions')
                )
            )
            total_pct = sum(d['avg_percentage'] for d in domain_stats) / domain_stats.count()
            score = round(total_pct, 1)
        else:
            score = 0.0
            
        results.append({
            "id": student.id,
            "name": (student.first_name + " " + student.last_name).strip() or student.username,
            "email": student.email,
            "readiness_score": score,
            "service_ready": round(min(100.0, score * 1.1), 1),
            "product_ready": round(score * 0.85, 1),
            "faang_ready": round(score * 0.65, 1)
        })
    
    return sorted(results, key=lambda x: x['readiness_score'], reverse=True)
