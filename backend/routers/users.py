from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Query
from sqlmodel import Session, select
from typing import List
import uuid
import os
import shutil

from core.database import get_session
from core.dependencies import get_current_user
from models.user import User
from schemas.user import UserPublic, UserUpdate, UserProfileView
from schemas.project import ProjectPublic
from schemas.recruitments import RecruitmentPublic
from crud.user import update_user, get_user_by_id

router = APIRouter(prefix="/users", tags=["Users"])


# Get the detail of the current user
@router.get("/me", response_model=UserPublic)
def get_my_profile(current_user: User = Depends(get_current_user)):
    return current_user


@router.get("/search", response_model=List[UserProfileView])
def search_users(
    q: str = Query(..., min_length=2),
    limit: int = Query(default=10, le=20),
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Search users by name or email. Excludes the current user."""
    pattern = f"%{q}%"
    statement = (
        select(User)
        .where((User.fullname.ilike(pattern)) | (User.iitk_email.ilike(pattern)))
        .where(User.id != current_user.id)
        .limit(limit)
    )
    return session.exec(statement).all()


@router.patch("/me", response_model=UserPublic)
def edit_my_profile(
    user_update: UserUpdate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    return update_user(session=session, db_user=current_user, user_update=user_update)


@router.post("/me/profile-picture", response_model=UserPublic)
def upload_profile_picture(
    file: UploadFile = File(...),
    db: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Uploads a profile picture and updates the user's profile_picture_url."""

    if not file.filename:
        raise HTTPException(status_code=400, detail="Filename is required.")

    content_type = file.content_type or ""
    if not content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image.")

    safe_name = os.path.basename(file.filename)
    extension = os.path.splitext(safe_name)[1].lstrip(".").lower()
    if not extension:
        raise HTTPException(status_code=400, detail="File extension is required.")

    filename = f"{current_user.id}_pfp.{extension}"

    # Define the save path
    save_dir = os.path.join("uploads", "profilePictures")
    os.makedirs(save_dir, exist_ok=True)
    file_path = os.path.join(save_dir, filename)

    # Save the physical file
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    # Build URL that matches the /uploads static mount in main.py
    url_path = f"/uploads/profilePictures/{filename}"

    # Update the database
    current_user.profile_picture_url = url_path
    db.add(current_user)
    db.commit()
    db.refresh(current_user)

    return current_user


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


@router.get("/{user_id}/projects", response_model=List[ProjectPublic])
def get_user_projects(
    user_id: uuid.UUID,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    user = get_user_by_id(session=session, user_id=user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user.projects


@router.get("/{user_id}/recruitments", response_model=List[RecruitmentPublic])
def get_user_recruitments(
    user_id: uuid.UUID,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    user = get_user_by_id(session=session, user_id=user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user.managed_recruitments
