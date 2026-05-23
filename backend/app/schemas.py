"""Pydantic schemas."""
from datetime import datetime
from typing import Optional, List, Any
from pydantic import BaseModel, EmailStr, Field


class UserCreate(BaseModel):
    username: str = Field(min_length=3, max_length=50)
    email: EmailStr
    password: str = Field(min_length=6)
    role: str = "analyst"


class UserOut(BaseModel):
    id: int
    username: str
    email: str
    role: str
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


class ScanRequest(BaseModel):
    target: str
    scan_type: str = "port"
    options: Optional[dict] = None


class ScanOut(BaseModel):
    id: int
    target: str
    scan_type: str
    status: str
    risk_score: float
    result: Any
    created_at: datetime

    class Config:
        from_attributes = True


class PayloadRequest(BaseModel):
    payload_type: str
    target_os: Optional[str] = "linux"
    lhost: Optional[str] = "127.0.0.1"
    lport: Optional[int] = 4444
    options: Optional[dict] = None


class PasswordAnalysis(BaseModel):
    password: str


class HashCrackRequest(BaseModel):
    hash_value: str
    hash_type: str = "md5"


class ThreatOut(BaseModel):
    id: int
    source_ip: str
    target_ip: Optional[str]
    country: Optional[str]
    threat_type: str
    severity: str
    confidence: float
    description: Optional[str]
    is_blocked: bool
    is_anomaly: bool
    created_at: datetime

    class Config:
        from_attributes = True


class AIChatRequest(BaseModel):
    message: str
    context: Optional[str] = "general"
    history: Optional[List[dict]] = None
    provider: Optional[str] = None  # openai | anthropic | builtin | None (auto)


class LogEntry(BaseModel):
    timestamp: str
    source: str
    level: str
    message: str
    risk: float = 0.0


class PromptScoreRequest(BaseModel):
    prompt: str


class PromptMutateRequest(BaseModel):
    prompt: str
    techniques: Optional[List[str]] = None
    test_against_llm: bool = False  # if True, send each variant to active LLM and report response


class PromptTestRequest(BaseModel):
    prompt: str
    provider: Optional[str] = None


# ── Report generation ──────────────────────────────────────────────────────────
from typing import Any
class ReportRequest(BaseModel):
    target: str
    findings: list[dict[str, Any]] = []
    scan_meta: dict[str, Any] | None = None
