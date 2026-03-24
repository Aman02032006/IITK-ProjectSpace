from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlmodel import Session
from typing import List
import uuid

from core.database import get_session
from core.dependencies import get_current_user
from models.user import User
from models.comments import Comment
from schemas.comments import CommentCreate, CommentPublic, CommentRepliesPage
from crud import comments as comment_crud
from crud import project as project_crud
from crud import recruitment as recruitment_crud
from crud.notification import create_notification
from core.utils import NotificationType

router = APIRouter(prefix="/comments", tags=["Comments"])


def _build_comment_public(comment: Comment, session: Session) -> CommentPublic:
    """Attach reply_count to a comment before returning it to the frontend."""
    result = CommentPublic.model_validate(comment, from_attributes=True)
    result.reply_count = comment_crud.count_direct_replies(session, comment.id)
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
        project = project_crud.get_project_by_id(
            session=session, project_id=comment_in.project_id
        )
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")

    recruitment = None
    if comment_in.recruitment_id:
        recruitment = recruitment_crud.get_recruitment_by_id(
            session=session, recruitment_id=comment_in.recruitment_id
        )
        if not recruitment:
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
    if not project_crud.get_project_by_id(session=session, project_id=project_id):
        raise HTTPException(status_code=404, detail="Project not found")
    comments = comment_crud.get_comments_by_project(
        session=session, project_id=project_id, skip=skip, limit=limit
    )
    return [_build_comment_public(c, session) for c in comments]


@router.get("/recruitment/{recruitment_id}", response_model=List[CommentPublic])
def get_recruitment_comments(
    recruitment_id: uuid.UUID,
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    session: Session = Depends(get_session),
):
    """Paginated top-level comments for a recruitment post."""
    if not recruitment_crud.get_recruitment_by_id(
        session=session, recruitment_id=recruitment_id
    ):
        raise HTTPException(status_code=404, detail="Recruitment not found")
    comments = comment_crud.get_comments_by_recruitment(
        session=session, recruitment_id=recruitment_id, skip=skip, limit=limit
    )
    return [_build_comment_public(c, session) for c in comments]


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
    total = comment_crud.count_direct_replies(session=session, comment_id=comment_id)
    return CommentRepliesPage(
        replies=[_build_comment_public(r, session) for r in replies],
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
        project = project_crud.get_project_by_id(
            session=session, project_id=comment.project_id
        )
        if project and project.creator_id == current_user.id:
            is_post_creator = True
    elif comment.recruitment_id:
        recruitment = recruitment_crud.get_recruitment_by_id(
            session=session, recruitment_id=comment.recruitment_id
        )
        if recruitment and recruitment.creator_id == current_user.id:
            is_post_creator = True

    if comment.author_id != current_user.id and not is_post_creator:
        raise HTTPException(
            status_code=403, detail="Not authorized to delete this comment"
        )

    comment_crud.delete_comment(session=session, db_comment=comment)
