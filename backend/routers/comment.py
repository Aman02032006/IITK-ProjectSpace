from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlmodel import Session, select
from typing import List, Mapping
import uuid

from core.database import get_session
from core.dependencies import get_current_user
from models.user import User
from models.comment import Comment
from models.project import Project
from models.recruitment import Recruitment
from schemas.comment import CommentCreate, CommentPublic, CommentRepliesPage
from crud import comment as comment_crud
from crud import project as project_crud
from crud import recruitment as recruitment_crud
from crud.notification import create_notification
from core.utils import NotificationType

router = APIRouter(prefix="/comments", tags=["Comments"])


def _build_comment_public(
    comment: Comment,
    session: Session,
    reply_counts: Mapping[uuid.UUID, int] | None = None,
) -> CommentPublic:
    """Attach reply_count to a comment before returning it to the frontend."""
    result = CommentPublic.model_validate(comment, from_attributes=True)
    if reply_counts is None:
        result.reply_count = comment_crud.count_direct_replies(session, comment.id)
    else:
        result.reply_count = reply_counts.get(comment.id, 0)
    return result


@router.post("/", response_model=CommentPublic, status_code=status.HTTP_201_CREATED)
def create_comment(
    comment_in: CommentCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Post a comment on a project or recruitment.
    Set parent_id to reply to an existing comment (max 5 levels deep)."""
    project = None
    if comment_in.project_id:
        project = session.exec(
            select(Project.id, Project.creator_id).where(Project.id == comment_in.project_id)
        )
        project = project.first()
        if project is None:
            raise HTTPException(status_code=404, detail="Project not found")

    recruitment = None
    if comment_in.recruitment_id:
        recruitment = session.exec(
            select(Recruitment.id, Recruitment.creator_id).where(
                Recruitment.id == comment_in.recruitment_id
            )
        )
        recruitment = recruitment.first()
        if recruitment is None:
            raise HTTPException(status_code=404, detail="Recruitment not found")

    parent = None
    if comment_in.parent_id:
        parent = comment_crud.get_comment_by_id(
            session=session, comment_id=comment_in.parent_id
        )
        if not parent:
            raise HTTPException(status_code=404, detail="Parent comment not found")
        if (
            parent.project_id != comment_in.project_id
            or parent.recruitment_id != comment_in.recruitment_id
        ):
            raise HTTPException(
                status_code=400,
                detail="Parent comment does not belong to the same post",
            )

    # depth check is inside crud.create_comment
    comment = comment_crud.create_comment(
        session=session, comment_create=comment_in, author_id=current_user.id
    )

    if parent:
        if parent.author_id != current_user.id:
            link = (
                f"/projects/{comment_in.project_id}"
                if comment_in.project_id
                else f"/recruitments/{comment_in.recruitment_id}"
            )
            create_notification(
                session=session,
                recipient_id=parent.author_id,
                type=NotificationType.COMMENT_REPLY,
                title="New Reply",
                message=f"{current_user.fullname} replied to your comment.",
                link=link,
                sender_id=current_user.id,
                related_entity_id=comment.id,
            )
    else:
        if project and project.creator_id != current_user.id:
            create_notification(
                session=session,
                recipient_id=project.creator_id,
                type=NotificationType.NEW_COMMENT,
                title="New Comment on Project",
                message=f"{current_user.fullname} commented on your project.",
                link=f"/projects/{project.id}",
                sender_id=current_user.id,
                related_entity_id=comment.id,
            )
        elif recruitment and recruitment.creator_id != current_user.id:
            create_notification(
                session=session,
                recipient_id=recruitment.creator_id,
                type=NotificationType.NEW_COMMENT,
                title="New Comment on Recruitment",
                message=f"{current_user.fullname} commented on your recruitment.",
                link=f"/recruitments/{recruitment.id}",
                sender_id=current_user.id,
                related_entity_id=comment.id,
            )

    session.commit()

    return _build_comment_public(comment, session)


@router.get("/project/{project_id}", response_model=List[CommentPublic])
def get_project_comments(
    project_id: uuid.UUID,
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    session: Session = Depends(get_session),
):
    """Paginated top-level comments for a project.
    Each comment includes reply_count so the frontend can show a 'load replies' button.
    """
    if not project_crud.project_exists(session=session, project_id=project_id):
        raise HTTPException(status_code=404, detail="Project not found")
    comments = comment_crud.get_comments_by_project(
        session=session, project_id=project_id, skip=skip, limit=limit
    )
    reply_counts = comment_crud.count_direct_replies_for_comments(
        session=session, comment_ids=[c.id for c in comments]
    )
    return [_build_comment_public(c, session, reply_counts) for c in comments]


@router.get("/recruitment/{recruitment_id}", response_model=List[CommentPublic])
def get_recruitment_comments(
    recruitment_id: uuid.UUID,
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    session: Session = Depends(get_session),
):
    """Paginated top-level comments for a recruitment post."""
    if not recruitment_crud.recruitment_exists(
        session=session, recruitment_id=recruitment_id
    ):
        raise HTTPException(status_code=404, detail="Recruitment not found")
    comments = comment_crud.get_comments_by_recruitment(
        session=session, recruitment_id=recruitment_id, skip=skip, limit=limit
    )
    reply_counts = comment_crud.count_direct_replies_for_comments(
        session=session, comment_ids=[c.id for c in comments]
    )
    return [_build_comment_public(c, session, reply_counts) for c in comments]


@router.get("/{comment_id}/replies", response_model=CommentRepliesPage)
def get_comment_replies(
    comment_id: uuid.UUID,
    skip: int = Query(0, ge=0),
    limit: int = Query(5, ge=1, le=20),
    session: Session = Depends(get_session),
):
    if not comment_crud.get_comment_by_id(session=session, comment_id=comment_id):
        raise HTTPException(status_code=404, detail="Comment not found")
    replies = comment_crud.get_replies_by_comment(
        session=session, comment_id=comment_id, skip=skip, limit=limit
    )
    reply_counts = comment_crud.count_direct_replies_for_comments(
        session=session, comment_ids=[r.id for r in replies]
    )
    total = comment_crud.count_direct_replies(session=session, comment_id=comment_id)
    return CommentRepliesPage(
        replies=[_build_comment_public(r, session, reply_counts) for r in replies],
        total=total,
    )


@router.get("/{comment_id}", response_model=CommentPublic)
def get_comment(
    comment_id: uuid.UUID,
    session: Session = Depends(get_session),
):
    comment = comment_crud.get_comment_by_id(session=session, comment_id=comment_id)
    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")
    return _build_comment_public(comment, session)


# Delete
@router.delete("/{comment_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_comment(
    comment_id: uuid.UUID,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Delete a comment. All replies are cascade-deleted by the DB automatically.
    Only the comment's author or the post creator can delete."""
    comment = comment_crud.get_comment_by_id(session=session, comment_id=comment_id)
    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")

    is_post_creator = False
    if comment.project_id:
        project_creator_id = session.exec(
            select(Project.creator_id).where(Project.id == comment.project_id)
        ).first()
        if project_creator_id == current_user.id:
            is_post_creator = True
    elif comment.recruitment_id:
        recruitment_creator_id = session.exec(
            select(Recruitment.creator_id).where(
                Recruitment.id == comment.recruitment_id
            )
        ).first()
        if recruitment_creator_id == current_user.id:
            is_post_creator = True

    if comment.author_id != current_user.id and not is_post_creator:
        raise HTTPException(
            status_code=403, detail="Not authorized to delete this comment"
        )

    comment_crud.delete_comment(session=session, db_comment=comment)
    session.commit()
