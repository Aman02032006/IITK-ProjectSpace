from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select
import uuid
from typing import Any

from core.database import get_session
from core.dependencies import get_current_user
from models.user import User
from schemas.notification import PaginatedNotifications, NotificationRead
from crud.notification import (
    get_user_notifications,
    mark_notification_read,
    mark_all_read,
    delete_notification,
)

router = APIRouter(prefix="/notifications", tags=["Notifications"])


@router.get("/", response_model=PaginatedNotifications)
def read_notifications(
    limit: int = 20,
    offset: int = 0,
    db: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Fetches notifications and enriches them with the sender's name and avatar."""
    results, total, unread_count = get_user_notifications(
        session=db, user_id=current_user.id, limit=limit, offset=offset
    )

    sender_ids = {n.sender_id for n in results if n.sender_id}
    sender_map = {}
    if sender_ids:
        senders = db.exec(select(User).where(User.id.in_(sender_ids))).all()
        sender_map = {sender.id: sender for sender in senders}

    # Map sender details efficiently
    enriched_results = []

    for n in results:
        sender_name = None
        sender_avatar = None

        if n.sender_id:
            sender = sender_map.get(n.sender_id)
            if sender:
                sender_name = sender.fullname
                sender_avatar = sender.profile_picture_url

        enriched_results.append(
            NotificationRead(
                id=n.id,
                recipient_id=n.recipient_id,
                sender_id=n.sender_id,
                type=n.type,
                title=n.title,
                message=n.message,
                link=n.link,
                related_entity_id=n.related_entity_id,
                is_read=n.is_read,
                created_at=n.created_at,
                sender_name=sender_name,
                sender_avatar=sender_avatar,
            )
        )

    return {
        "total": total,
        "unread_count": unread_count,
        "limit": limit,
        "offset": offset,
        "results": enriched_results,
    }


@router.patch("/{notification_id}/read")
def mark_single_notification_read(
    notification_id: uuid.UUID,
    db: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    notification = mark_notification_read(
        session=db, notification_id=notification_id, user_id=current_user.id
    )
    if not notification:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Notification not found"
        )
    db.commit()
    return {"message": "Notification marked as read"}


@router.delete("/{notification_id}")
def delete_single_notification(
    notification_id: uuid.UUID,
    db: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Permanently removes a notification from the user's tray."""
    deleted = delete_notification(
        session=db, notification_id=notification_id, user_id=current_user.id
    )
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Notification not found"
        )
    db.commit()
    return {"message": "Notification deleted"}


@router.patch("/read-all")
def mark_all_notifications_read(
    db: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Utility endpoint to clear the unread badge counter in one click."""
    mark_all_read(session=db, user_id=current_user.id)
    db.commit()
    return {"message": "All unread notifications marked as read"}
