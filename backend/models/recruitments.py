import uuid
from datetime import datetime
from typing import List, Optional
from sqlmodel import SQLModel, Field, Relationship
from sqlalchemy.dialects.postgresql import ARRAY, TSVECTOR
from sqlalchemy import String, Column, Computed, Index


# The Recruiter Link Table. Connects multiple Users (recruiters) to multiple Recruitments
class RecruitmentRecruiterLink(SQLModel, table=True):
    recruitment_id: Optional[uuid.UUID] = Field(
        default=None, foreign_key="recruitment.id", primary_key=True
    )
    user_id: Optional[uuid.UUID] = Field(
        default=None, foreign_key="user.id", primary_key=True
    )


class RecruitmentPendingLink(SQLModel, table=True):
    recruitment_id: uuid.UUID = Field(foreign_key="recruitment.id", primary_key=True)
    user_id: uuid.UUID = Field(foreign_key="user.id", primary_key=True)


# 2. The Application Table. It links a User and a Recruitment,
class Application(SQLModel, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)

    applicant_id: uuid.UUID = Field(foreign_key="user.id", ondelete="CASCADE")
    recruitment_id: uuid.UUID = Field(foreign_key="recruitment.id", ondelete="CASCADE")

    message: Optional[str] = Field(
        default=None, max_length=500, description="Optional cover letter"
    )
    status: str = Field(default="Pending")  # Could be Pending, Accepted, Rejected

    applied_at: datetime = Field(default_factory=datetime.utcnow)

    applicant: "User" = Relationship(back_populates="applications")
    recruitment: "Recruitment" = Relationship(back_populates="applications")


# 3. The Recruitment Base
class RecruitmentBase(SQLModel):
    title: str = Field(index=True, max_length=100)
    description: str
    description_format: str = Field(default="markdown")

    domains: List[str] = Field(default_factory=list, sa_column=Column(ARRAY(String)))
    prerequisites: List[str] = Field(
        default_factory=list, sa_column=Column(ARRAY(String))
    )
    allowed_designations: List[str] = Field(
        default_factory=list, sa_column=Column(ARRAY(String))
    )
    allowed_departments: List[str] = Field(
        default_factory=list, sa_column=Column(ARRAY(String))
    )

    links: List[str] = Field(default_factory=list, sa_column=Column(ARRAY(String)))
    media_urls: List[str] = Field(default_factory=list, sa_column=Column(ARRAY(String)))

    status: str = Field(default="Open", index=True)  # Open or Closed


class Recruitment(RecruitmentBase, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)

    creator_id: uuid.UUID = Field(foreign_key="user.id", ondelete="CASCADE")
    creator: Optional["User"] = Relationship(
        sa_relationship_kwargs={
            "foreign_keys": "[Recruitment.creator_id]",
            "lazy": "joined",
        }
    )

    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    recruiters: List["User"] = Relationship(
        back_populates="managed_recruitments", link_model=RecruitmentRecruiterLink
    )

    pending_recruiters: List["User"] = Relationship(link_model=RecruitmentPendingLink)

    applications: List[Application] = Relationship(back_populates="recruitment")

    comments: List["Comment"] = Relationship(back_populates="recruitment")

    search_vector: Optional[str] = Field(
        default=None,
        sa_column=Column(
            TSVECTOR,
            Computed(
                "to_tsvector('english', coalesce(title, '') || ' ' || coalesce(description, ''))",
                persisted=True,
            ),
        ),
    )

    __table_args__ = (
        Index("ix_recruitment_search_vector", "search_vector", postgresql_using="gin"),
    )
