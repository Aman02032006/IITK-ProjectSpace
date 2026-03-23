from pydantic import BaseModel, Field
from typing import Optional
import uuid
from datetime import datetime


# A schema just to show who wrote the comment
class UserSummary(BaseModel):
    id: uuid.UUID
    fullname: str
    profile_picture_url: Optional[str] = None

    class Config:
        from_attributes = True


class CommentBase(BaseModel):
    """Shared fields used across create/update/view schemas."""

    content: str = Field(..., max_length=1000, description="The body of the comment")


class CommentCreate(CommentBase):
    """Schema for a user posting a new comment."""

    project_id: uuid.UUID
    # We don't include author_id here
    # The router will grab that from the logged in user's session


class CommentUpdate(BaseModel):
    """Schema for editing an existing comment."""

    content: Optional[str] = Field(default=None, max_length=1000)


class CommentPublic(CommentBase):
    """Full comment details returned to the frontend."""

    id: uuid.UUID
    project_id: uuid.UUID
    author: UserSummary  # This will automatically populate using the relationship
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
