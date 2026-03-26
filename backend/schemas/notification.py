from pydantic import BaseModel, ConfigDict
import uuid
from datetime import datetime
from typing import Optional, List
from core.utils import NotificationType


class NotificationRead(BaseModel):
    id: uuid.UUID
    recipient_id: uuid.UUID
    sender_id: Optional[uuid.UUID] = None
    type: NotificationType
    title: str
    message: str
    link: str
    related_entity_id: Optional[uuid.UUID] = None
    is_read: bool
    created_at: datetime
    sender_name: Optional[str] = None
    sender_avatar: Optional[str] = None


class PaginatedNotifications(BaseModel):
    total: int
    unread_count: int
    limit: int
    offset: int
    results: List[NotificationRead]
