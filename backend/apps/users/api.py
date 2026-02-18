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
    name: Optional[str] = None # Added name for frontend compatibility
    avatar: Optional[str] = None

class LoginSchema(Schema):
    email: str
    password: str

@router.post("/login", auth=None)
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
            "name": getattr(user, 'name', user.username), # Fallback if name not set
            "avatar": user.avatar
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
    logger.debug(f"Fetching current user: {request.user.username}")
    return request.user

@router.get("/", response=List[UserSchema], auth=django_auth)
def list_users(request):
    return User.objects.all()
