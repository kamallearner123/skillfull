from typing import List
from ninja import Router, Schema
from django.shortcuts import get_object_or_404
from .models import Team, TeamMembership

router = Router()

class TeamSchema(Schema):
    id: str
    name: str
    department_id: str
    active: bool

class CreateTeamSchema(Schema):
    name: str
    department_id: str

@router.get("/", response=List[TeamSchema])
def list_teams(request):
    # TODO: Add permission checks (e.g. only user's teams)
    if request.user.is_authenticated:
        return Team.objects.filter(members=request.user, active=True)
    return Team.objects.none()

@router.post("/", response=TeamSchema)
def create_team(request, payload: CreateTeamSchema):
    if not request.user.is_authenticated:
         return 403, {"message": "Unauthorized"}
    # TODO: Check if user is DEPT_ADMIN
    team = Team.objects.create(**payload.dict())
    return team
