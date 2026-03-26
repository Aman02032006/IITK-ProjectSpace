from pydantic import BaseModel, Field, field_validator, computed_field
from typing import Optional, List, Any
import uuid
from datetime import datetime
from core.utils import Designation, Department
from schemas.comments import CommentPublic


class UserSummary(BaseModel):
    # A tiny schema just to show who is on a team

    id: uuid.UUID
    fullname: str
    designation: Designation
    department: Department
    profile_picture_url: Optional[str] = None

    class Config:
        from_attributes = True


class ApplicationCreate(BaseModel):
    # Schema for a user submitting an application to a recruitment

    recruitment_id: uuid.UUID
    message: Optional[str] = Field(default=None, max_length=500)


class ApplicationUpdate(BaseModel):
    # Schema for recruiters updating the status of an application

    status: str = Field(..., pattern="^(Pending|Accepted|Rejected)$")

    @field_validator("status")
    @classmethod
    def validate_status(cls, v: str) -> str:
        allowed = {"Pending", "Accepted", "Rejected"}
        if v not in allowed:
            raise ValueError(f"Status must be one of: {', '.join(allowed)}")
        return v


class ApplicationPublic(BaseModel):
    # Schema returned when viewing an application

    id: uuid.UUID
    applicant: UserSummary
    recruitment_id: uuid.UUID
    message: Optional[str] = None
    status: str
    applied_at: datetime

    class Config:
        from_attributes = True


class MyRecruitmentApplicationPublic(BaseModel):
    # Schema for an applicant to view their own recruitment application statuses

    id: uuid.UUID
    recruitment_id: uuid.UUID
    message: Optional[str] = None
    status: str
    applied_at: datetime

    @computed_field
    @property
    def recruitment_title(self) -> str:
        recruitment = getattr(self, "recruitment", None)
        if recruitment is not None:
            return recruitment.title or ""
        return ""

    @computed_field
    @property
    def recruitment_domains(self) -> List[str]:
        recruitment = getattr(self, "recruitment", None)
        if recruitment is not None:
            return recruitment.domains or []
        return []

    @computed_field
    @property
    def recruitment_status(self) -> str:
        recruitment = getattr(self, "recruitment", None)
        if recruitment is not None:
            return recruitment.status or "Closed"
        return "Closed"

    class Config:
        from_attributes = True


class RecruitmentBase(BaseModel):
    # Shared fields for creating and updating a recruitment

    title: str = Field(..., max_length=100)
    description: str
    description_format: str = Field(default="markdown")
    domains: List[str] = Field(default_factory=list)
    prerequisites: List[str] = Field(default_factory=list)
    allowed_designations: List[str] = Field(default_factory=list)
    allowed_departments: List[str] = Field(default_factory=list)
    status: str = Field(default="Open")

    links: List[str] = Field(default_factory=list, max_length=4)
    media_urls: List[str] = Field(default_factory=list, max_length=5)

    @field_validator("status")
    @classmethod
    def validate_status(cls, v: str) -> str:
        allowed = {"Open", "Closed"}
        if v not in allowed:
            raise ValueError(f"Status must be one of: {', '.join(allowed)}")
        return v

    @field_validator("description_format")
    @classmethod
    def validate_description_format(cls, v: str) -> str:
        allowed = {"markdown", "plain-text"}
        if v not in allowed:
            raise ValueError(f"description_format must be one of: {', '.join(allowed)}")
        return v


class RecruitmentCreate(RecruitmentBase):
    # Schema for creating a new recruitment post
    recruiter_ids: List[uuid.UUID] = []
    pass


class RecruitmentUpdate(BaseModel):
    # Schema for partially updating an existing recruitment

    title: Optional[str] = Field(default=None, max_length=100)
    description: Optional[str] = None
    description_format: Optional[str] = None
    domains: Optional[List[str]] = None
    prerequisites: Optional[List[str]] = None
    allowed_designations: Optional[List[str]] = None
    allowed_departments: Optional[List[str]] = None
    status: Optional[str] = None

    links: Optional[List[str]] = Field(default=None, max_length=4)
    media_urls: Optional[List[str]] = Field(default=None, max_length=5)

    @field_validator("status")
    @classmethod
    def validate_status(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and v not in {"Open", "Closed"}:
            raise ValueError("Status must be either 'Open' or 'Closed'")
        return v

    @field_validator("description_format")
    @classmethod
    def validate_description_format(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and v not in {"markdown", "plain-text"}:
            raise ValueError("description_format must be 'markdown' or 'plain-text'")
        return v


class RecruitmentPublic(RecruitmentBase):
    # Full recruitment details returned to the frontend

    id: uuid.UUID
    created_at: datetime
    updated_at: datetime
    recruiters: List[UserSummary] = []
    pending_recruiters: List[UserSummary] = []
    applications: List[ApplicationPublic] = []
    creator_id: uuid.UUID
    comments: List[CommentPublic] = []

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


class RecruitmentSummary(BaseModel):
    # Lightweight recruitment card for list/search views

    id: uuid.UUID
    title: str
    domains: List[str] = []
    prerequisites: List[str] = []
    allowed_designations: List[str] = []
    allowed_departments: List[str] = []
    status: str
    created_at: datetime
    recruiters: List[UserSummary] = []
    media_urls: List[str] = []
    creator_id: uuid.UUID

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
