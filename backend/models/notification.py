from sqlmodel import SQLModel, Field
import uuid
from datetime import datetime
from typing import Optional
from core.utils import NotificationType, now


class Notification(SQLModel, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    recipient_id: uuid.UUID = Field(foreign_key="user.id", index=True)
    sender_id: Optional[uuid.UUID] = Field(default=None, foreign_key="user.id")

    type: NotificationType
    title: str
    message: str
    link: str

    related_entity_id: Optional[uuid.UUID] = Field(default=None)
    is_read: bool = Field(default=False)

    created_at: datetime = Field(default_factory=now)
