from pydantic import BaseModel, Field, field_validator
from typing import Optional, List, Any
import uuid
from datetime import datetime
from core.utils import Degree, Department, Designation

# ─────────────────────────────────────────────
# User Search
# ─────────────────────────────────────────────


class UserSearchResult(BaseModel):
    """Lightweight user card returned in search results."""

    id: uuid.UUID
    fullname: Optional[str] = None  # Optional: user may not have set it yet
    iitk_email: str
    designation: Designation
    degree: Degree
    department: Department
    profile_picture_url: Optional[str] = None
    bio: str = ""
    skills: List[str] = []
    domains: List[str] = []

    class Config:
        from_attributes = True


class PaginatedUserResults(BaseModel):
    total: int
    offset: int
    limit: int
    results: List[UserSearchResult]


# ─────────────────────────────────────────────
# Project Search
# ─────────────────────────────────────────────


class ProjectSearchResult(BaseModel):
    """Lightweight project card returned in search results."""

    id: uuid.UUID
    title: str
    summary: str
    domains: List[str] = []
    creator_id: uuid.UUID
    created_at: datetime
    creator_name: str = ""
    creator_avatar_url: Optional[str] = None
    member_count: int = 0

    class Config:
        from_attributes = True


class PaginatedProjectResults(BaseModel):
    total: int
    offset: int
    limit: int
    results: List[ProjectSearchResult]


# ─────────────────────────────────────────────
# Recruitment Search
# ─────────────────────────────────────────────


class RecruitmentSearchResult(BaseModel):
    """Lightweight recruitment card returned in search results."""

    id: uuid.UUID
    title: str
    domains: List[str] = []
    prerequisites: List[str] = []
    allowed_designations: List[str] = []
    allowed_departments: List[str] = []
    status: str
    created_at: datetime
    recruiters: List[uuid.UUID] = []  # list of recruiter user IDs
    creator_id: uuid.UUID
    creator_name: str = ""
    creator_avatar_url: Optional[str] = None

    @field_validator("recruiters", mode="before")
    @classmethod
    def extract_recruiter_ids(cls, v: Any) -> List[uuid.UUID]:
        if not v:
            return []
        return [item.id if hasattr(item, "id") else item for item in v]

    class Config:
        from_attributes = True


class PaginatedRecruitmentResults(BaseModel):
    total: int
    offset: int
    limit: int
    results: List[RecruitmentSearchResult]
