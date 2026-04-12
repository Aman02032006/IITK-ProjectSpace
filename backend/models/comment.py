from sqlmodel import SQLModel, Field, Relationship
from sqlalchemy import Index
from typing import Optional, List
from datetime import datetime
import uuid
from core.utils import now


class Comment(SQLModel, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)

    content: str = Field(nullable=False, max_length=1000)
    reply_count: int = Field(default=0, sa_column=None)
    project_id: Optional[uuid.UUID] = Field(
        default=None, foreign_key="project.id", ondelete="CASCADE"
    )
    recruitment_id: Optional[uuid.UUID] = Field(
        default=None, foreign_key="recruitment.id", ondelete="CASCADE"
    )
    author_id: uuid.UUID = Field(foreign_key="user.id", ondelete="CASCADE")
    parent_id: Optional[uuid.UUID] = Field(
        default=None, foreign_key="comment.id", ondelete="CASCADE"
    )

    created_at: datetime = Field(default_factory=now)
    updated_at: datetime = Field(default_factory=now)

    __table_args__ = (
        Index("ix_comment_project_id", "project_id"),
        Index("ix_comment_recruitment_id", "recruitment_id"),
        Index("ix_comment_parent_created_at", "parent_id", "created_at"),
    )

    # Relationships
    project: Optional["Project"] = Relationship(back_populates="comments")
    recruitment: Optional["Recruitment"] = Relationship(back_populates="comments")
    author: "User" = Relationship(back_populates="comments")

    # Self-referential: parent and its replies
    parent: Optional["Comment"] = Relationship(
        back_populates="replies",
        sa_relationship_kwargs={
            "primaryjoin": "Comment.parent_id == Comment.id",
            "remote_side": "Comment.id",
            "lazy": "select",
        },
    )
    replies: List["Comment"] = Relationship(
        back_populates="parent",
        sa_relationship_kwargs={
            "primaryjoin": "Comment.parent_id == Comment.id",
            "lazy": "select",
            "passive_deletes": True,
        },
    )
