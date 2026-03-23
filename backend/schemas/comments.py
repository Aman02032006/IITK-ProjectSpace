from pydantic import BaseModel, Field
from typing import Optional, List
import uuid
from datetime import datetime


<<<<<<< Updated upstream
# A schema just to show who wrote the comment
=======
>>>>>>> Stashed changes
class UserSummary(BaseModel):
    """Who wrote the comment."""
    id: uuid.UUID
    fullname: str
    profile_picture_url: Optional[str] = None

    class Config:
        from_attributes = True


class CommentBase(BaseModel):
<<<<<<< Updated upstream
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

=======
    content: str = Field(..., max_length=1000)

class CommentRepliesPage(BaseModel):
    replies: List[CommentPublic]
    total: int


class CommentCreate(CommentBase):
    project_id: Optional[uuid.UUID] = None
    recruitment_id: Optional[uuid.UUID] = None
    parent_id: Optional[uuid.UUID] = None


class CommentPublic(CommentBase):
>>>>>>> Stashed changes
    id: uuid.UUID
    project_id: Optional[uuid.UUID] = None
    recruitment_id: Optional[uuid.UUID] = None
    parent_id: Optional[uuid.UUID] = None
    author: UserSummary
    created_at: datetime
    updated_at: datetime
    reply_count: int = 0

    class Config:
        from_attributes = True
