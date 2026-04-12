import uuid
from datetime import datetime
from typing import List, Optional
from sqlmodel import SQLModel, Field, Relationship
from core.utils import now
from sqlalchemy.dialects.postgresql import ARRAY, TSVECTOR
from sqlalchemy import String, Column, Computed, Index


class RecruitmentRecruiterLink(SQLModel, table=True):
    """
    Association table connecting multiple Users (recruiters) to multiple Recruitments.
    Allows a team of people to manage the same recruitment post.
    """
    recruitment_id: Optional[uuid.UUID] = Field(
        default=None, foreign_key="recruitment.id", primary_key=True
    )
    user_id: Optional[uuid.UUID] = Field(
        default=None, foreign_key="user.id", primary_key=True
    )


class RecruitmentPendingLink(SQLModel, table=True):
    """Tracks users who have been invited to be recruiters but haven't accepted yet."""
    recruitment_id: uuid.UUID = Field(foreign_key="recruitment.id", primary_key=True)
    user_id: uuid.UUID = Field(foreign_key="user.id", primary_key=True)


class Application(SQLModel, table=True):
    """
    Links a User (applicant) to a Recruitment. 
    Unlike a standard link table, this acts as a full table because we need 
    to store extra data about the relationship (message, status, timestamp).
    """
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)

    applicant_id: uuid.UUID = Field(foreign_key="user.id", ondelete="CASCADE")
    recruitment_id: uuid.UUID = Field(foreign_key="recruitment.id", ondelete="CASCADE")

    message: Optional[str] = Field(
        default=None, max_length=500, description="Optional cover letter"
    )
    status: str = Field(default="Pending")  # Could be Pending, Accepted, Rejected

    applied_at: datetime = Field(default_factory=now)

    __table_args__ = (
        Index("ix_application_recruitment_id", "recruitment_id"),
        Index("ix_application_applicant_id", "applicant_id"),
        Index("ix_application_recruitment_applicant", "recruitment_id", "applicant_id"),
        Index("ix_application_recruitment_applied_at", "recruitment_id", "applied_at"),
    )

    # Relationships to easily fetch the user or the recruitment details from an application
    applicant: "User" = Relationship(back_populates="applications")
    recruitment: "Recruitment" = Relationship(back_populates="applications")


class RecruitmentBase(SQLModel):
    """Shared fields for the recruitment schema and database model."""
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

    # Loads the creator object whenever a recruitment post is queried
    creator: Optional["User"] = Relationship(
        sa_relationship_kwargs={
            "foreign_keys": "[Recruitment.creator_id]",
            "lazy": "joined",
        }
    )

    created_at: datetime = Field(default_factory=now)
    updated_at: datetime = Field(default_factory=now)

    recruiters: List["User"] = Relationship(
        back_populates="managed_recruitments", link_model=RecruitmentRecruiterLink
    )

    pending_recruiters: List["User"] = Relationship(link_model=RecruitmentPendingLink)

    applications: List[Application] = Relationship(back_populates="recruitment")

    comments: List["Comment"] = Relationship(back_populates="recruitment")

    # Computes a search vector from the title and description to power the 
    # search functionality
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

    # GIN index for high-performance text searches
    __table_args__ = (
        Index("ix_recruitment_search_vector", "search_vector", postgresql_using="gin"),
        Index("ix_recruitment_domains_gin", "domains", postgresql_using="gin"),
        Index("ix_recruitment_prerequisites_gin", "prerequisites", postgresql_using="gin"),
        Index(
            "ix_recruitment_allowed_designations_gin",
            "allowed_designations",
            postgresql_using="gin",
        ),
        Index(
            "ix_recruitment_allowed_departments_gin",
            "allowed_departments",
            postgresql_using="gin",
        ),
    )
