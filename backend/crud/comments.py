from sqlmodel import Session, select, func
from fastapi import HTTPException, status
from typing import Sequence
import uuid

from models.comments import Comment
from schemas.comments import CommentCreate

MAX_COMMENT_DEPTH = 5


def _get_depth(session: Session, comment_id: uuid.UUID) -> int:
    """Walk up the parent chain and return this comment's depth (1 = top-level)."""
    depth = 1
    current_id = comment_id
    while True:
        parent_id = session.exec(
            select(Comment.parent_id).where(Comment.id == current_id)
        ).first()
        if parent_id is None:
            break
        depth += 1
        current_id = parent_id
    return depth


def create_comment(
    session: Session, comment_create: CommentCreate, author_id: uuid.UUID
) -> Comment:
    if not comment_create.project_id and not comment_create.recruitment_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A comment must be linked to either a project or a recruitment.",
        )
    if comment_create.project_id and comment_create.recruitment_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A comment cannot be linked to both a project and a recruitment.",
        )

    if comment_create.parent_id:
        parent_depth = _get_depth(session, comment_create.parent_id)
        if parent_depth >= MAX_COMMENT_DEPTH:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Replies can only be nested up to {MAX_COMMENT_DEPTH} levels deep.",
            )

    db_comment = Comment(
        content=comment_create.content,
        project_id=comment_create.project_id,
        recruitment_id=comment_create.recruitment_id,
        parent_id=comment_create.parent_id,
        author_id=author_id,
    )
    session.add(db_comment)
    session.commit()
    session.refresh(db_comment)
    return db_comment


def get_comment_by_id(session: Session, comment_id: uuid.UUID) -> Comment | None:
    return session.get(Comment, comment_id)


def get_comments_by_project(
    session: Session, project_id: uuid.UUID, skip: int = 0, limit: int = 20
) -> Sequence[Comment]:
    """Top-level comments only (parent_id IS NULL). Replies are loaded separately."""
    return session.exec(
        select(Comment)
        .where(Comment.project_id == project_id, Comment.parent_id == None)
        .order_by(Comment.created_at.asc())
        .offset(skip)
        .limit(limit)
    ).all()


def get_comments_by_recruitment(
    session: Session, recruitment_id: uuid.UUID, skip: int = 0, limit: int = 20
) -> Sequence[Comment]:
    """Top-level comments only (parent_id IS NULL). Replies are loaded separately."""
    return session.exec(
        select(Comment)
        .where(Comment.recruitment_id == recruitment_id, Comment.parent_id == None)
        .order_by(Comment.created_at.asc())
        .offset(skip)
        .limit(limit)
    ).all()


def get_replies_by_comment(
    session: Session, comment_id: uuid.UUID, skip: int = 0, limit: int = 5
) -> Sequence[Comment]:
    """Direct replies to a given comment, paginated (default 5 per page)."""
    return session.exec(
        select(Comment)
        .where(Comment.parent_id == comment_id)
        .order_by(Comment.created_at.asc())
        .offset(skip)
        .limit(limit)
    ).all()


def count_direct_replies(session: Session, comment_id: uuid.UUID) -> int:
    """How many direct children does this comment have."""
    return session.exec(
        select(func.count()).select_from(Comment).where(Comment.parent_id == comment_id)
    ).one()


def count_comments_by_project(session: Session, project_id: uuid.UUID) -> int:
    return session.exec(
        select(func.count())
        .select_from(Comment)
        .where(Comment.project_id == project_id)
    ).one()


def count_comments_by_recruitment(session: Session, recruitment_id: uuid.UUID) -> int:
    return session.exec(
        select(func.count())
        .select_from(Comment)
        .where(Comment.recruitment_id == recruitment_id)
    ).one()


def delete_comment(session: Session, db_comment: Comment) -> None:
    """DB cascade handles deleting all child replies automatically."""
    session.delete(db_comment)
    session.commit()
