from sqlmodel import SQLModel, Field, Relationship
from sqlalchemy import Column, String, Computed, Index
from sqlalchemy.dialects.postgresql import ARRAY, TSVECTOR
from typing import Optional, List
from datetime import datetime
import uuid

from core.utils import Degree, Department, Designation
from models.project import ProjectTeamLink
from models.recruitments import RecruitmentRecruiterLink


class User(SQLModel, table=True):

    # Unique Credentials
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    fullname: str = Field(default=None, max_length=64)
    iitk_email: str = Field(unique=True, index=True, max_length=255)
    secondary_email: Optional[str] = Field(unique=True, index=True, max_length=255)
    hashed_password: str = Field(nullable=False)

    # Academic Details
    designation: Designation = Field(default=Designation.NA)
    degree: Degree = Field(default=Degree.NA)
    department: Department = Field(default=Department.NA)
    institution: str = Field(default="IIT Kanpur", max_length=255)

    # Social Links
    github: Optional[str] = Field(default=None, max_length=255)
    linkedin: Optional[str] = Field(default=None, max_length=255)
    other_link1: Optional[str] = Field(default=None, max_length=255)
    other_link2: Optional[str] = Field(default=None, max_length=255)

    # Profile Data
    bio: str = Field(default="", max_length=1000)
    skills: List[str] = Field(default=[], sa_column=Column(ARRAY(String)))
    domains: List[str] = Field(default=[], sa_column=Column(ARRAY(String)))

    # Profile Picture
    profile_picture_url: Optional[str] = Field(default=None, max_length=512)

    # Auth flags
    is_active: bool = Field(default=False)

    # Timestamps
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    # Projects the user is a part of
    projects: List["Project"] = Relationship(
        back_populates="team_members", link_model=ProjectTeamLink
    )

    # Recruitments the user is a part of
    managed_recruitments: List["Recruitment"] = Relationship(
        back_populates="recruiters", link_model=RecruitmentRecruiterLink
    )

    # Applications the user has applied
    applications: List["Application"] = Relationship(back_populates="applicant")

    comments: List["Comment"] = Relationship(back_populates="author")

    search_vector: Optional[str] = Field(
        default=None,
        sa_column=Column(
            TSVECTOR,
            Computed(
                "to_tsvector('english', coalesce(fullname, '') || ' ' || coalesce(iitk_email, ''))",
                persisted=True,
            ),
        ),
    )

    __table_args__ = (
        Index("ix_user_search_vector", "search_vector", postgresql_using="gin"),
    )
