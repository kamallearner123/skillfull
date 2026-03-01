from pydantic import BaseModel, Field
from typing import List

class DomainPerformance(BaseModel):
    domain: str
    count: int
    avg_percentage: float

class ReadinessInput(BaseModel):
    student_name: str
    total_assessments: int
    overall_average: float
    domain_breakdown: List[DomainPerformance]
    request_type: str = "overall_readiness"

class ReadinessResponse(BaseModel):
    overall_summary: str
    priority_topics: List[str]
