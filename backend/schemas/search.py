from pydantic import BaseModel, Field, computed_field
from typing import Optional, List
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

    @computed_field
    @property
    def creator_name(self) -> str:
        creator = getattr(self, "creator", None)
        if creator is not None:
            return creator.fullname or ""
        return ""

    @computed_field
    @property
    def creator_avatar_url(self) -> Optional[str]:
        creator = getattr(self, "creator", None)
        if creator is not None:
            return creator.profile_picture_url
        return None

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

    class Config:
        from_attributes = True


class PaginatedRecruitmentResults(BaseModel):
    total: int
    offset: int
    limit: int
    results: List[RecruitmentSearchResult]
