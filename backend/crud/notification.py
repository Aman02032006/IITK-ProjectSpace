from sqlmodel import Session, select, func
from sqlalchemy import update
from typing import List, Tuple, Optional
import uuid
from models.notification import Notification
from core.utils import NotificationType


def create_notification(
    session: Session,
    recipient_id: uuid.UUID,
    type: NotificationType,
    title: str,
    message: str,
    link: str,
    sender_id: Optional[uuid.UUID] = None,
    related_entity_id: Optional[uuid.UUID] = None,
) -> Notification:
    notification = Notification(
        recipient_id=recipient_id,
        sender_id=sender_id,
        type=type,
        title=title,
        message=message,
        link=link,
        related_entity_id=related_entity_id,
    )
    session.add(notification)
    session.flush()
    session.refresh(notification)
    return notification

'''
Fetches a user's notification with pagination (limit/offset) to prevent loading thousands of rows at once.
Also calculates total and unread counts so that frontend can display badges.
'''
def get_user_notifications(
    session: Session, user_id: uuid.UUID, limit: int = 20, offset: int = 0
) -> Tuple[List[Notification], int, int]:
    # Query for Total count
    total = session.exec(
        select(func.count())
        .select_from(Notification)
        .where(Notification.recipient_id == user_id)
    ).one()

    # Query for Unread count
    unread_count = session.exec(
        select(func.count())
        .select_from(Notification)
        .where(Notification.recipient_id == user_id, Notification.is_read == False)
    ).one()

    # Paginated results mapped by most recent first
    statement = (
        select(Notification)
        .where(Notification.recipient_id == user_id)
        .order_by(Notification.created_at.desc())
        .offset(offset)
        .limit(limit)
    )
    results = session.exec(statement).all()

    return results, total, unread_count


def mark_notification_read(
    session: Session, notification_id: uuid.UUID, user_id: uuid.UUID
) -> Optional[Notification]:
    statement = select(Notification).where(
        Notification.id == notification_id, Notification.recipient_id == user_id
    )
    notification = session.exec(statement).first()
    if notification and not notification.is_read:
        notification.is_read = True
        session.add(notification)
        session.flush()
    return notification


def delete_notification(
    session: Session, notification_id: uuid.UUID, user_id: uuid.UUID
) -> bool:
    notification = session.exec(
        select(Notification).where(
            Notification.id == notification_id, Notification.recipient_id == user_id
        )
    ).first()
    if not notification:
        return False
    session.delete(notification)
    session.flush()
    return True


def mark_all_read(session: Session, user_id: uuid.UUID) -> None:
    session.exec(
        update(Notification)
        .where(Notification.recipient_id == user_id, Notification.is_read == False)
        .values(is_read=True)
    )
