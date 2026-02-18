from django.contrib.auth.models import AbstractUser
from django.db import models
from apps.core.models import BaseModel

class User(AbstractUser, BaseModel):
    class Role(models.TextChoices):
        STUDENT = 'STUDENT', 'Student'
        MENTOR = 'MENTOR', 'Teacher/Mentor'
        DEPT_ADMIN = 'DEPT_ADMIN', 'Department Admin'
        PRINCIPAL = 'PRINCIPAL', 'Principal'
        SUPER_ADMIN = 'SUPER_ADMIN', 'Super Admin'

    email = models.EmailField(unique=True)
    role = models.CharField(max_length=20, choices=Role.choices, default=Role.STUDENT)
    avatar = models.CharField(max_length=500, null=True, blank=True)
    
    # For Google OAuth mapping
    google_id = models.CharField(max_length=255, null=True, blank=True)

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['username']

    def __str__(self):
        return self.email
