from sqlmodel import SQLModel, Field, Relationship
from datetime import datetime
import uuid

class Comment(SQLModel, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)

    content: str = Field(nullable=False, max_length=1000)

    # Foreign Keys
    # ondelete="CASCADE" ensures that if a project or user is deleted, their comments vanish too
    project_id: uuid.UUID = Field(foreign_key="project.id", ondelete="CASCADE")
    author_id: uuid.UUID = Field(foreign_key="user.id", ondelete="CASCADE")
    
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    # These allow you to type `comment.author.fullname` or `comment.project.title` in your routes
    project: "Project" = Relationship(back_populates="comments")
    author: "User" = Relationship(back_populates="comments")