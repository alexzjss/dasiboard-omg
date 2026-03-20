from __future__ import annotations
from uuid import UUID
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, EmailStr, field_validator


# ── Auth ──────────────────────────────────────────────────
class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    nusp: Optional[str] = None

    @field_validator("email")
    @classmethod
    def must_be_usp(cls, v: str) -> str:
        if not v.lower().endswith("@usp.br"):
            raise ValueError("Apenas e-mails @usp.br são permitidos")
        return v.lower()

    @field_validator("password")
    @classmethod
    def min_length(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Senha deve ter pelo menos 8 caracteres")
        return v


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class RefreshRequest(BaseModel):
    refresh_token: str


class UserOut(BaseModel):
    id: UUID
    email: str
    full_name: str
    nusp: Optional[str] = None
    avatar_url: Optional[str] = None
    is_verified: bool
    created_at: datetime

    model_config = {"from_attributes": True}


# ── Kanban ────────────────────────────────────────────────
class CardCreate(BaseModel):
    title: str
    description: Optional[str] = None
    priority: str = "medium"
    due_date: Optional[datetime] = None
    position: int = 0
    column_id: Optional[UUID] = None


class CardOut(BaseModel):
    id: UUID
    column_id: UUID
    title: str
    description: Optional[str] = None
    priority: str
    due_date: Optional[datetime] = None
    position: int
    created_at: datetime
    updated_at: datetime
    model_config = {"from_attributes": True}


class ColumnCreate(BaseModel):
    title: str
    position: int = 0


class ColumnOut(BaseModel):
    id: UUID
    board_id: UUID
    title: str
    position: int
    cards: List[CardOut] = []
    model_config = {"from_attributes": True}


class BoardCreate(BaseModel):
    title: str
    color: str = "#3B82F6"


class BoardOut(BaseModel):
    id: UUID
    owner_id: UUID
    title: str
    color: str
    created_at: datetime
    columns: List[ColumnOut] = []
    model_config = {"from_attributes": True}


# ── Grades ────────────────────────────────────────────────
class GradeCreate(BaseModel):
    label: str
    value: float
    weight: float = 1.0
    max_value: float = 10.0
    date: Optional[datetime] = None
    notes: Optional[str] = None


class GradeOut(BaseModel):
    id: UUID
    subject_id: UUID
    label: str
    value: float
    weight: float
    max_value: float
    date: Optional[datetime] = None
    notes: Optional[str] = None
    created_at: datetime
    model_config = {"from_attributes": True}


class SubjectCreate(BaseModel):
    code: str
    name: str
    professor: Optional[str] = None
    semester: str
    color: str = "#8B5CF6"


class SubjectOut(BaseModel):
    id: UUID
    owner_id: UUID
    code: str
    name: str
    professor: Optional[str] = None
    semester: str
    color: str
    grades: List[GradeOut] = []
    created_at: datetime
    model_config = {"from_attributes": True}



# ── EventCreate + EventOut updated with global/class_code ────────────────────
class EventCreate(BaseModel):
    title: str
    description: Optional[str] = None
    event_type: str = "personal"
    start_at: datetime
    end_at: Optional[datetime] = None
    all_day: bool = False
    color: str = "#10B981"
    location: Optional[str] = None
    class_code: Optional[str] = None
    is_global: bool = False


class EventOut(BaseModel):
    id: UUID
    owner_id: UUID
    title: str
    description: Optional[str] = None
    event_type: str
    start_at: datetime
    end_at: Optional[datetime] = None
    all_day: bool
    color: str
    location: Optional[str] = None
    class_code: Optional[str] = None
    is_global: bool = False
    created_at: datetime
    model_config = {"from_attributes": True}
