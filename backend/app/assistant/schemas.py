from typing import Any, Optional
from pydantic import BaseModel, Field


class AssistantContext(BaseModel):
    session_id: Optional[str] = None
    dashboard: Optional[str] = None
    date_t0: Optional[str] = None
    metric: Optional[str] = None
    segment: Optional[str] = None
    filters: dict[str, Any] = Field(default_factory=dict)


class ChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=2000)
    context: AssistantContext = Field(default_factory=AssistantContext)


class AnalysisRequest(BaseModel):
    dashboard: Optional[str] = None
    date_t0: Optional[str] = None
    metric: str = "EAD_MAD"
    filters: dict[str, Any] = Field(default_factory=dict)


class ReportRequest(AnalysisRequest):
    title: Optional[str] = None
