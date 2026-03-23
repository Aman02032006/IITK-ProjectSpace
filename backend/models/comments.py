from sqlmodel import SQLModel, Field, Relationship
from typing import Optional, List
from datetime import datetime
import uuid


class Comment(SQLModel, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)

    content: str = Field(nullable=False, max_length=1000)

    project_id: Optional[uuid.UUID] = Field(default=None, foreign_key="project.id", ondelete="CASCADE")
    recruitment_id: Optional[uuid.UUID] = Field(default=None, foreign_key="recruitment.id", ondelete="CASCADE")
    author_id: uuid.UUID = Field(foreign_key="user.id", ondelete="CASCADE")
<<<<<<< Updated upstream
=======
    parent_id: Optional[uuid.UUID] = Field(default=None, foreign_key="comment.id", ondelete="CASCADE")
>>>>>>> Stashed changes

    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

<<<<<<< Updated upstream
    # These allow you to type `comment.author.fullname` or `comment.project.title` in your routes
    project: "Project" = Relationship(back_populates="comments")
    author: "User" = Relationship(back_populates="comments")
=======
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
        },
    )
>>>>>>> Stashed changes
