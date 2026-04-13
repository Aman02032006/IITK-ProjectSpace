import uuid
from datetime import datetime
from typing import List, Optional
from sqlmodel import SQLModel, Field, Column, Relationship
from core.utils import now
from sqlalchemy.dialects.postgresql import ARRAY, TSVECTOR
from sqlalchemy import String, Column, Computed, Index


class ProjectTeamLink(SQLModel, table=True):
    """
    Association table linking Users to Projects as official team members.
    A project can have many members, and a user can be in many projects.
    """

    project_id: Optional[uuid.UUID] = Field(
        default=None, foreign_key="project.id", primary_key=True
    )
    user_id: Optional[uuid.UUID] = Field(
        default=None, foreign_key="user.id", primary_key=True
    )


class ProjectPendingLink(SQLModel, table=True):
    project_id: uuid.UUID = Field(foreign_key="project.id", primary_key=True)
    user_id: uuid.UUID = Field(foreign_key="user.id", primary_key=True)


class ProjectBase(SQLModel):
    title: str = Field(index=True, max_length=100)
    summary: str = Field(max_length=250)
    description: str
    description_format: str = Field(
        default="markdown", description="Either 'plain-text' or 'markdown'"
    )
    """
    Core project fields. This class is inherited by the actual Project model 
    and can be reused for Pydantic validation schemas (like ProjectCreate).
    """

    domains: List[str] = Field(default_factory=list, sa_column=Column(ARRAY(String)))
    links: List[str] = Field(default_factory=list, sa_column=Column(ARRAY(String)))
    media_urls: List[str] = Field(default_factory=list, sa_column=Column(ARRAY(String)))


class Project(ProjectBase, table=True):
    """
    The actual 'project' table in the database. 
    It combines the base fields with IDs, timestamps, and relationship definitions.
    """

    # ondelete="CASCADE" ensures that if the creator's account is deleted, 
    # all of their projects are deleted with it to prevent orphaned data.
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    creator_id: uuid.UUID = Field(foreign_key="user.id", ondelete="CASCADE")

    created_at: datetime = Field(default_factory=now)
    updated_at: datetime = Field(default_factory=now)

    # 'lazy="joined"' tells SQLAlchemy to automatically fetch the creator's info 
    # whenever a project is queried.
    creator: Optional["User"] = Relationship(
        sa_relationship_kwargs={
            "foreign_keys": "[Project.creator_id]",
            "lazy": "joined",
        }
    )

    # Uses the link_model to automatically manage the Many-to-Many team list
    team_members: List["User"] = Relationship(
        back_populates="projects", link_model=ProjectTeamLink
    )

    pending_members: List["User"] = Relationship(link_model=ProjectPendingLink)

    comments: List["Comment"] = Relationship(back_populates="project")

    search_vector: Optional[str] = Field(
        default=None,
        sa_column=Column(
            TSVECTOR,
            Computed(
                "to_tsvector('english', coalesce(title, '') || ' ' || coalesce(summary, '') || ' ' || coalesce(description, ''))",
                persisted=True,
            ),
        ),
    )

    __table_args__ = (
        Index("ix_project_search_vector", "search_vector", postgresql_using="gin"),
        Index("ix_project_domains_gin", "domains", postgresql_using="gin"),
    )
