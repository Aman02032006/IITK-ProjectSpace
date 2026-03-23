from sqlmodel import Session, select
from typing import Sequence
from datetime import datetime
import uuid

from models.comments import Comment
from schemas.comments import CommentCreate, CommentUpdate


def create_comment(
    session: Session, comment_create: CommentCreate, author_id: uuid.UUID
) -> Comment:
    db_comment = Comment.model_validate(comment_create)

    db_comment.author_id = author_id

    session.add(db_comment)
    session.commit()
    session.refresh(db_comment)

    return db_comment


def get_comment_by_id(session: Session, comment_id: uuid.UUID) -> Comment | None:
    return session.get(Comment, comment_id)


def get_comments_by_project(
    session: Session, project_id: uuid.UUID, skip: int = 0, limit: int = 100
) -> Sequence[Comment]:
    statement = (
        select(Comment)
        .where(Comment.project_id == project_id)
        .offset(skip)
        .limit(limit)
    )
    return session.exec(statement).all()


def update_comment(
    session: Session, db_comment: Comment, comment_update: CommentUpdate
) -> Comment:
    update_data = comment_update.model_dump(exclude_unset=True)

    for key, value in update_data.items():
        setattr(db_comment, key, value)

    # Always trigger the manual updated_at timestamp so people know it was edited
    db_comment.updated_at = datetime.utcnow()

    session.add(db_comment)
    session.commit()
    session.refresh(db_comment)

    return db_comment


def delete_comment(session: Session, db_comment: Comment) -> None:
    session.delete(db_comment)
    session.commit()
