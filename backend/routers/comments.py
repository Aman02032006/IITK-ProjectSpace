from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session
from typing import List
import uuid

from core.database import get_session
from core.dependencies import get_current_user
from models.user import User
from schemas.comments import CommentCreate, CommentUpdate, CommentPublic
from crud import comments as comment_crud
from crud import project as project_crud

router = APIRouter(prefix="/comments", tags=["Comments"])


@router.post("/", response_model=CommentPublic, status_code=status.HTTP_201_CREATED)
def create_comment(
    comment_in: CommentCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    project = project_crud.get_project_by_id(
        session=session, project_id=comment_in.project_id
    )
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Project not found"
        )

    return comment_crud.create_comment(
        session=session, comment_create=comment_in, author_id=current_user.id
    )


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
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
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


@router.delete("/{comment_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_comment(
    comment_id: uuid.UUID,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    comment = comment_crud.get_comment_by_id(session=session, comment_id=comment_id)
    if not comment:
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

    comment_crud.delete_comment(session=session, db_comment=comment)
    return {"message": "Comment deleted successfully"}
