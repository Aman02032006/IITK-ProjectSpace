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

router = APIRouter(prefix="/comments", tags=["Comments"])


<<<<<<< Updated upstream
=======
def _build_comment_public(comment: Comment, session: Session) -> CommentPublic:
    """Attach reply_count to a comment before returning it to the frontend."""
    result = CommentPublic.model_validate(comment)
    result.reply_count = comment_crud.count_direct_replies(session, comment.id)
    return result


>>>>>>> Stashed changes
@router.post("/", response_model=CommentPublic, status_code=status.HTTP_201_CREATED)
def create_comment(
    comment_in: CommentCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
<<<<<<< Updated upstream
    project = project_crud.get_project_by_id(
        session=session, project_id=comment_in.project_id
    )
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Project not found"
        )
=======
    """Post a comment on a project or recruitment.
    Set parent_id to reply to an existing comment (max 5 levels deep)."""
    if comment_in.project_id:
        if not project_crud.get_project_by_id(session=session, project_id=comment_in.project_id):
            raise HTTPException(status_code=404, detail="Project not found")
>>>>>>> Stashed changes

    if comment_in.recruitment_id:
        if not recruitment_crud.get_recruitment_by_id(session=session, recruitment_id=comment_in.recruitment_id):
            raise HTTPException(status_code=404, detail="Recruitment not found")

    if comment_in.parent_id:
        parent = comment_crud.get_comment_by_id(session=session, comment_id=comment_in.parent_id)
        if not parent:
            raise HTTPException(status_code=404, detail="Parent comment not found")
        if parent.project_id != comment_in.project_id or parent.recruitment_id != comment_in.recruitment_id:
            raise HTTPException(status_code=400, detail="Parent comment does not belong to the same post")

    # depth check is inside crud.create_comment
    comment = comment_crud.create_comment(session=session, comment_create=comment_in, author_id=current_user.id)
    return _build_comment_public(comment, session)


@router.get("/{comment_id}/replies", response_model=CommentRepliesPage)
def get_comment_replies(
    comment_id: uuid.UUID,
    skip: int = Query(0, ge=0),
    limit: int = Query(5, ge=1, le=20),
    session: Session = Depends(get_session),
):
    if not comment_crud.get_comment_by_id(session=session, comment_id=comment_id):
        raise HTTPException(status_code=404, detail="Comment not found")
    replies = comment_crud.get_replies_by_comment(session=session, comment_id=comment_id, skip=skip, limit=limit)
    total = comment_crud.count_direct_replies(session=session, comment_id=comment_id)
    return CommentRepliesPage(
        replies=[_build_comment_public(r, session) for r in replies],
        total=total,
    )


<<<<<<< Updated upstream
@router.get("/project/{project_id}", response_model=List[CommentPublic])
def get_project_comments(
    project_id: uuid.UUID,
    skip: int = 0,
    limit: int = 50,
    session: Session = Depends(get_session),
):
    return comment_crud.get_comments_by_project(
        session=session, project_id=project_id, skip=skip, limit=limit
    )


@router.patch("/{comment_id}", response_model=CommentPublic)
def update_comment(
    comment_id: uuid.UUID,
    comment_in: CommentUpdate,
=======
@router.get("/{comment_id}", response_model=CommentPublic)
def get_comment(
    comment_id: uuid.UUID,
    session: Session = Depends(get_session),
):
    comment = comment_crud.get_comment_by_id(session=session, comment_id=comment_id)
    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")
    return _build_comment_public(comment, session)


@router.get("/project/{project_id}", response_model=List[CommentPublic])
def get_project_comments(
    project_id: uuid.UUID,
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
>>>>>>> Stashed changes
    session: Session = Depends(get_session),
):
<<<<<<< Updated upstream
    comment = comment_crud.get_comment_by_id(session=session, comment_id=comment_id)
    if not comment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Comment not found"
        )

    # Only the original author can edit their comment
    if comment.author_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only edit your own comments",
        )

    return comment_crud.update_comment(
        session=session, db_comment=comment, comment_update=comment_in
    )
=======
    """Paginated top-level comments for a project.
    Each comment includes reply_count so the frontend can show a 'load replies' button."""
    if not project_crud.get_project_by_id(session=session, project_id=project_id):
        raise HTTPException(status_code=404, detail="Project not found")
    comments = comment_crud.get_comments_by_project(session=session, project_id=project_id, skip=skip, limit=limit)
    return [_build_comment_public(c, session) for c in comments]
>>>>>>> Stashed changes


@router.get("/recruitment/{recruitment_id}", response_model=List[CommentPublic])
def get_recruitment_comments(
    recruitment_id: uuid.UUID,
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    session: Session = Depends(get_session),
):
    """Paginated top-level comments for a recruitment post."""
    if not recruitment_crud.get_recruitment_by_id(session=session, recruitment_id=recruitment_id):
        raise HTTPException(status_code=404, detail="Recruitment not found")
    comments = comment_crud.get_comments_by_recruitment(session=session, recruitment_id=recruitment_id, skip=skip, limit=limit)
    return [_build_comment_public(c, session) for c in comments]


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
<<<<<<< Updated upstream
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Comment not found"
        )

    project = project_crud.get_project_by_id(
        session=session, project_id=comment.project_id
    )
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Project not found"
        )

    # Only the comment's author and project owner can delete the comment
    if comment.author_id != current_user.id and project.creator_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to delete this comment",
        )
=======
        raise HTTPException(status_code=404, detail="Comment not found")
>>>>>>> Stashed changes

    is_post_creator = False
    if comment.project_id:
        project = project_crud.get_project_by_id(session=session, project_id=comment.project_id)
        if project and project.creator_id == current_user.id:
            is_post_creator = True
    elif comment.recruitment_id:
        recruitment = recruitment_crud.get_recruitment_by_id(session=session, recruitment_id=comment.recruitment_id)
        if recruitment and recruitment.creator_id == current_user.id:
            is_post_creator = True

    if comment.author_id != current_user.id and not is_post_creator:
        raise HTTPException(status_code=403, detail="Not authorized to delete this comment")

    comment_crud.delete_comment(session=session, db_comment=comment)