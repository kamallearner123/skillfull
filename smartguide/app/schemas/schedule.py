"""Pydantic schemas for the /schedule endpoint."""
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import date


class DailyTask(BaseModel):
    title: str
    description: str
    estimated_minutes: int = 60
    resource_url: Optional[str] = None


class DayPlan(BaseModel):
    date: str  # ISO-8601 string, e.g. "2026-02-22"
    day_label: str  # e.g. "Day 1 — Spark Fundamentals"
    topic: str
    tasks: List[DailyTask]
    total_hours: float


class ScheduleRequest(BaseModel):
    student_name: str
    domain: str
    weak_topics: List[str] = Field(default_factory=list)
    strong_topics: List[str] = Field(default_factory=list)
    target_date: str = Field(..., description="ISO-8601 target date, e.g. 2026-03-15")
    available_hours_per_day: float = Field(default=2.0, ge=0.5, le=12.0)
    goal: str = Field(default="Interview", description="Written test | Interview | Both")


class ScheduleResponse(BaseModel):
    student_name: str
    domain: str
    goal: str
    start_date: str
    target_date: str
    total_days: int
    plan: List[DayPlan]
    overall_strategy: str = ""
