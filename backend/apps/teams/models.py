from django.db import models
from django.conf import settings
from apps.core.models import BaseModel

class Department(BaseModel):
    name = models.CharField(max_length=255)
    head = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name='led_departments')

    def __str__(self):
        return self.name

class Team(BaseModel):
    name = models.CharField(max_length=255)
    department = models.ForeignKey(Department, on_delete=models.CASCADE, related_name='teams')
    active = models.BooleanField(default=True)
    members = models.ManyToManyField(settings.AUTH_USER_MODEL, through='TeamMembership')

    def __str__(self):
        return self.name

class TeamMembership(BaseModel):
    team = models.ForeignKey(Team, on_delete=models.CASCADE)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    is_lead = models.BooleanField(default=False)
    joined_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('team', 'user')
