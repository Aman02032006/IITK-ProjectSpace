from pydantic import BaseModel, Field
from typing import Optional, List
import uuid
from datetime import datetime


# A schema just to show who wrote the comment
class UserSummary(BaseModel):
    """Who wrote the comment."""

    id: uuid.UUID
    fullname: str
    profile_picture_url: Optional[str] = None

    class Config:
        from_attributes = True


class CommentBase(BaseModel):
    content: str = Field(..., max_length=1000)


class CommentCreate(CommentBase):
    project_id: Optional[uuid.UUID] = None
    recruitment_id: Optional[uuid.UUID] = None
    parent_id: Optional[uuid.UUID] = None


class CommentPublic(CommentBase):
    id: uuid.UUID
    project_id: Optional[uuid.UUID] = None
    recruitment_id: Optional[uuid.UUID] = None
    parent_id: Optional[uuid.UUID] = None
    author: UserSummary
    created_at: datetime
    updated_at: datetime
    reply_count: int = Field(default=0)

    class Config:
        from_attributes = True


class CommentRepliesPage(BaseModel):
    replies: List[CommentPublic]
    total: int
