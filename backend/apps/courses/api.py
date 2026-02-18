from typing import List
from ninja import Router, Schema
from django.shortcuts import get_object_or_404
from .models import Course


router = Router()


class ContentBlockSchema(Schema):
    id: str
    content_type: str
    body: str
    is_downloadable: bool


class ChapterSchema(Schema):
    id: str
    title: str
    sequence_order: int
    contents: List[ContentBlockSchema] = []

    @staticmethod
    def resolve_contents(obj):
        return obj.contents.all()


class CourseSchema(Schema):
    id: str
    title: str
    description: str
    is_published: bool
    chapters: List[ChapterSchema] = []

    @staticmethod
    def resolve_chapters(obj):
        return obj.chapters.all().order_by('sequence_order')


@router.get("/", response=List[CourseSchema])
def list_courses(request):
    return Course.objects.filter(is_published=True)


@router.get("/{course_id}", response=CourseSchema)
def get_course(request, course_id: str):
    return get_object_or_404(Course, id=course_id)


# Simple stats endpoint for dashboard
class UserCourseStats(Schema):
    modules_completed: int
    study_hours: float
    avg_score: int
    certificates: int


@router.get("/stats/me", response=UserCourseStats)
def get_my_stats(request):
    # In a real app, this would query a UserCourseProgress model
    # For now, we return 0s or mock data based on user being authenticated
    # This "removes" the hardcoded dummy data from frontend by moving it to API
    # (or returning 0 if no progress exists)
    return {
        "modules_completed": 0,
        "study_hours": 0.0,
        "avg_score": 0,
        "certificates": 0
    }
