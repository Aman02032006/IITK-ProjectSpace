from pydantic import BaseModel, Field, HttpUrl, field_validator, computed_field
from typing import Optional, List, Any
import uuid
from datetime import datetime
from core.utils import Designation


class UserSummary(BaseModel):
    # A tiny schema just to show who is on a team

    id: uuid.UUID
    fullname: str
    designation: Designation
    profile_picture_url: Optional[str] = None

    class Config:
        from_attributes = True


class ProjectBase(BaseModel):
    # Shared fields used across create/update/view schemas.

    title: str = Field(..., max_length=100)
    summary: str = Field(..., max_length=250)
    description: str
    description_format: str = Field(default="markdown")
    domains: List[str] = Field(default_factory=list)
    links: List[str] = Field(default_factory=list, max_length=4)
    media_urls: List[str] = Field(default_factory=list, max_length=5)

    @field_validator("description_format")
    @classmethod
    def validate_description_format(cls, v: str) -> str:
        allowed = {"markdown", "plain-text"}
        if v not in allowed:
            raise ValueError(f"description_format must be one of: {', '.join(allowed)}")
        return v


class ProjectCreate(ProjectBase):
    # Schema for creating a new project. Creator is inferred from auth token.
    team_member_ids: List[uuid.UUID] = []
    pass


class ProjectUpdate(BaseModel):
    # Schema for partially updating an existing project.

    title: Optional[str] = Field(default=None, max_length=100)
    summary: Optional[str] = Field(default=None, max_length=250)
    description: Optional[str] = None
    description_format: Optional[str] = None
    domains: Optional[List[str]] = None
    links: Optional[List[str]] = None
    media_urls: Optional[List[str]] = None

    @field_validator("description_format")
    @classmethod
    def validate_description_format(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and v not in {"markdown", "plain-text"}:
            raise ValueError("description_format must be 'markdown' or 'plain-text'")
        return v


class ProjectPublic(ProjectBase):
    # Full project details returned to the frontend.

    id: uuid.UUID
    created_at: datetime
    updated_at: datetime
    team_members: List[UserSummary] = []
    pending_members: List[UserSummary] = []
    creator_id: uuid.UUID

    creator: Optional[Any] = Field(default=None, exclude=True)

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


class ProjectSummary(BaseModel):
    # Lightweight project card for list/search views.

    id: uuid.UUID
    title: str
    summary: str
    domains: List[str] = []
    created_at: datetime
    team_members: List[UserSummary] = []
    media_urls: List[str] = []
    creator_id: uuid.UUID

    creator: Optional[Any] = Field(default=None, exclude=True)

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
