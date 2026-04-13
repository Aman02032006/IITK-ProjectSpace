from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    status,
    UploadFile,
    File,
    Query,
    BackgroundTasks,
)
from sqlmodel import Session, select
from sqlalchemy.orm import selectinload
from typing import List
from datetime import timedelta
import uuid
import pathlib
import os
import shutil
import secrets

from core.utils import now
from crud.user import update_user, get_user_by_id
from core.database import get_session
from core.dependencies import get_current_user
from core.email import send_otp_email

from models.user import User
from models.otp import OTPVerification
from models.project import Project, ProjectTeamLink
from models.recruitment import Recruitment, RecruitmentRecruiterLink

from schemas.user import (
    UserPublic,
    UserUpdate,
    UserProfileView,
    SecondaryEmailRequest,
    SecondaryEmailVerify,
)
from schemas.project import ProjectSummary
from schemas.recruitment import RecruitmentSummary

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
    updated_user = update_user(
        session=session, db_user=current_user, user_update=user_update
    )
    session.commit()
    return updated_user


@router.post("/me/request-secondary-email-otp", status_code=status.HTTP_200_OK)
def request_secondary_email_otp(
    request_data: SecondaryEmailRequest,
    background_tasks: BackgroundTasks,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Sends an OTP to the requested secondary email."""

    # Check if this email is already used by ANY user as primary or secondary
    statement = select(User).where(
        (User.iitk_email == request_data.secondary_email)
        | (User.secondary_email == request_data.secondary_email)
    )
    if session.exec(statement).first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This email is already registered to an account.",
        )

    # Clean up old OTPs for this email/purpose
    existing_otp = session.exec(
        select(OTPVerification)
        .where(OTPVerification.email == request_data.secondary_email)
        .where(OTPVerification.purpose == "secondary_email")
    ).first()

    if existing_otp:
        session.delete(existing_otp)
        session.commit()

    # Generate new OTP
    otp_code = "".join([str(secrets.randbelow(10)) for _ in range(6)])
    new_otp = OTPVerification(
        email=request_data.secondary_email,
        full_name=current_user.fullname,
        otp_code=otp_code,
        purpose="secondary_email",
        expires_at=now() + timedelta(minutes=10),
    )
    session.add(new_otp)
    session.commit()

    # Queue Email
    background_tasks.add_task(
        send_otp_email,
        email_to=request_data.secondary_email,
        otp_code=otp_code,
        name=current_user.fullname,
        purpose="secondary_email",
    )
    return {"message": "Verification code sent to secondary email."}


@router.post("/me/verify-secondary-email", response_model=UserPublic)
def verify_secondary_email(
    verify_data: SecondaryEmailVerify,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Verifies the OTP and links the secondary email to the profile."""

    otp_record = session.exec(
        select(OTPVerification)
        .where(OTPVerification.email == verify_data.secondary_email)
        .where(OTPVerification.purpose == "secondary_email")
    ).first()

    if not otp_record or otp_record.otp_code != verify_data.otp_code:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid verification code."
        )

    if otp_record.expires_at < now():
        session.delete(otp_record)
        session.commit()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Verification code has expired.",
        )

    # OTP is valid! Update the user's profile
    current_user.secondary_email = verify_data.secondary_email
    session.add(current_user)
    session.delete(otp_record)
    session.commit()
    session.refresh(current_user)

    return current_user


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

    # Define a robust save path relative to the backend root, not the current working directory
    backend_root = pathlib.Path(__file__).resolve().parent.parent
    save_dir = backend_root / "uploads" / "profilePictures"
    os.makedirs(save_dir, exist_ok=True)
    file_path = save_dir / filename

    # Save the physical file
    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception:
        # This will help debug permissions or disk space issues in the future.
        raise HTTPException(status_code=500, detail="Could not save file to disk.")

    # Build URL that matches the /uploads static mount in main.py
    url_path = f"/uploads/profilePictures/{filename}"

    # Update the database
    current_user.profile_picture_url = url_path
    db.add(current_user)
    db.commit()
    db.refresh(current_user)

    return current_user


@router.delete("/me/profile-picture", response_model=UserPublic)
def remove_profile_picture(
    db: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Removes the current user's profile picture."""
    # Delete the physical file if it exists on disk
    if current_user.profile_picture_url:
        backend_root = pathlib.Path(__file__).resolve().parent.parent
        file_path = backend_root / current_user.profile_picture_url.lstrip("/")
        if file_path.exists():
            file_path.unlink(missing_ok=True)

    current_user.profile_picture_url = None
    db.add(current_user)
    db.commit()
    db.refresh(current_user)
    return current_user


# Get current user's projects
@router.get("/me/projects", response_model=List[ProjectSummary])
def get_my_projects(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    statement = (
        select(Project)
        .join(ProjectTeamLink, ProjectTeamLink.project_id == Project.id)
        .where(ProjectTeamLink.user_id == current_user.id)
        .order_by(Project.created_at.desc())
        .options(
            selectinload(Project.creator),
            selectinload(Project.team_members),
        )
    )
    return session.exec(statement).all()


# Get current user's recruitments
@router.get("/me/recruitments", response_model=List[RecruitmentSummary])
def get_my_recruitments(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    statement = (
        select(Recruitment)
        .join(
            RecruitmentRecruiterLink,
            RecruitmentRecruiterLink.recruitment_id == Recruitment.id,
        )
        .where(RecruitmentRecruiterLink.user_id == current_user.id)
        .order_by(Recruitment.created_at.desc())
        .options(
            selectinload(Recruitment.creator),
            selectinload(Recruitment.recruiters),
        )
    )
    return session.exec(statement).all()


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


@router.get("/{user_id}/projects", response_model=List[ProjectSummary])
def get_user_projects(
    user_id: uuid.UUID,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    user = get_user_by_id(session=session, user_id=user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    statement = (
        select(Project)
        .join(ProjectTeamLink, ProjectTeamLink.project_id == Project.id)
        .where(ProjectTeamLink.user_id == user_id)
        .order_by(Project.created_at.desc())
        .options(
            selectinload(Project.creator),
            selectinload(Project.team_members),
        )
    )
    return session.exec(statement).all()


@router.get("/{user_id}/recruitments", response_model=List[RecruitmentSummary])
def get_user_recruitments(
    user_id: uuid.UUID,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    user = get_user_by_id(session=session, user_id=user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    statement = (
        select(Recruitment)
        .join(
            RecruitmentRecruiterLink,
            RecruitmentRecruiterLink.recruitment_id == Recruitment.id,
        )
        .where(RecruitmentRecruiterLink.user_id == user_id)
        .order_by(Recruitment.created_at.desc())
        .options(
            selectinload(Recruitment.creator),
            selectinload(Recruitment.recruiters),
        )
    )
    return session.exec(statement).all()
