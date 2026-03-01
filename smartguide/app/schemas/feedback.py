"""Pydantic schemas for the /feedback endpoint."""
from pydantic import BaseModel, Field
from typing import List, Optional


class QuestionDetail(BaseModel):
    """Detail for a single answered question."""
    question: str
    options: List[str] = Field(default_factory=list)
    user_answer: Optional[str] = None
    correct_answer: str
    is_correct: bool = False
    subject: Optional[str] = None
    difficulty: Optional[str] = None


class AssessmentInput(BaseModel):
    """Data sent from the Django proxy after a completed assessment."""
    attempt_id: str = Field(..., description="UUID of the completed AssessmentAttempt")
    student_name: str = Field(..., description="Display name of the student")
    domain: str = Field(..., description="Assessment domain, e.g. 'Data Engineering'")
    score: int = Field(..., ge=0, description="Number of correct answers")
    total: int = Field(..., ge=1, description="Total number of questions")
    percentage: float = Field(..., ge=0, le=100)
    weak_topics: List[str] = Field(default_factory=list)
    strong_topics: List[str] = Field(default_factory=list)
    wrong_answers: List[QuestionDetail] = Field(default_factory=list)
    correct_answers: List[QuestionDetail] = Field(default_factory=list)


class Resource(BaseModel):
    title: str
    url: str
    type: str = "article"  # article | video | course | documentation


class PrepTopic(BaseModel):
    """A single topic in the personalised preparation plan."""
    topic: str = Field(..., description="Specific topic/concept to study")
    hours_needed: int = Field(..., ge=1, description="Estimated study hours")
    priority: str = Field("high", description="high | medium | low")
    what_to_study: str = Field("", description="Concrete study actions (e.g. 'Revise DAG concepts, do 10 practice Qs')")
    resources: List[str] = Field(default_factory=list, description="Quick resource titles or URLs")


class FeedbackResponse(BaseModel):
    attempt_id: str
    domain: str
    overall_summary: str = Field(..., description="2-3 sentence performance summary")
    strengths: List[str] = Field(default_factory=list)
    improvement_areas: List[str] = Field(default_factory=list)
    priority_topics: List[str] = Field(default_factory=list, description="Top topics to study next")
    suggested_resources: List[Resource] = Field(default_factory=list)
    motivational_note: str = ""
    prep_plan: List[PrepTopic] = Field(default_factory=list, description="Personalised study plan with hours per topic")
