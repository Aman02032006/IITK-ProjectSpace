from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select
import uuid

from core.database import get_session
from core.dependencies import get_current_user
from models.user import User
from schemas.user import UserPublic, UserUpdate, UserProfileView
from crud.user import update_user, get_user_by_id

router = APIRouter(prefix="/users", tags=["Users"])


# Get the detail of the current user
@router.get("/me", response_model=UserPublic)
def get_my_profile(current_user: User = Depends(get_current_user)):
    return current_user


# Update the details of the current user
@router.patch("/me", response_model=UserPublic)
def edit_my_profile(
    user_update: UserUpdate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    updated_user = update_user(
        session=session, db_user=current_user, user_update=user_update
    )
    return updated_user


# Get the detail of some other user
@router.get("/{user_id}", response_model=UserProfileView)
def get_user_profile(
    user_id: uuid.UUID,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    user = get_user_by_id(session=session, user_id=user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="User not found"
        )
    return user

# Get current user's projects
@router.get("/me/projects", response_model=List[ProjectPublic])
def get_my_projects(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    return current_user.projects


# Get current user's recruitments
@router.get("/me/recruitments", response_model=List[RecruitmentPublic])
def get_my_recruitments(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    return current_user.managed_recruitments
