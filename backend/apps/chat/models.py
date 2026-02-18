from django.db import models
from django.conf import settings
from apps.core.models import BaseModel
from apps.teams.models import Team

class ChatRoom(BaseModel):
    # Can be team chat or 1:1
    name = models.CharField(max_length=255, blank=True, null=True)
    team = models.ForeignKey(Team, null=True, blank=True, on_delete=models.CASCADE)
    is_direct_message = models.BooleanField(default=False)
    participants = models.ManyToManyField(settings.AUTH_USER_MODEL)

class Message(BaseModel):
    room = models.ForeignKey(ChatRoom, on_delete=models.CASCADE, related_name='messages')
    sender = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    content = models.TextField()
    is_read = models.BooleanField(default=False)
    # Important for offline sync: local_id helps dedup if client resends
    client_generated_id = models.CharField(max_length=255, null=True, blank=True)
