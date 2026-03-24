from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from fastapi.responses import FileResponse
from sqlmodel import Session, select
from typing import List
import uuid
import os
import shutil

from core.database import get_session
from core.dependencies import get_current_user
from models.user import User
from models.recruitments import RecruitmentRecruiterLink, RecruitmentPendingLink

from schemas.recruitments import (
    RecruitmentCreate,
    RecruitmentUpdate,
    RecruitmentPublic,
    RecruitmentSummary,
    ApplicationCreate,
    ApplicationUpdate,
    ApplicationPublic,
)
from crud.recruitment import (
    create_recruitment,
    get_recruitment_by_id,
    get_all_recruitments,
    count_recruitments,
    update_recruitment,
    delete_recruitment,
    create_application,
    get_application_by_id,
    update_application_status,
)
from crud.notification import create_notification
from core.utils import NotificationType

router = APIRouter(prefix="/recruitments", tags=["Recruitments"])


def _safe_filename(filename: str) -> str:
    if not filename:
        raise HTTPException(status_code=400, detail="Filename is required")
    safe_name = os.path.basename(filename.strip())
    if not safe_name or safe_name in {".", ".."} or safe_name != filename:
        raise HTTPException(status_code=400, detail="Invalid filename")
    return safe_name


@router.post("/", response_model=RecruitmentPublic, status_code=status.HTTP_201_CREATED)
def create_new_recruitment(
    recruitment_in: RecruitmentCreate,
    db: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Creates a new recruitment post and makes the user the lead recruiter."""
    recruiter_ids = recruitment_in.recruiter_ids or []
    recruitment_in.recruiter_ids = []

    recruitment = create_recruitment(
        session=db, recruitment_create=recruitment_in, creator_id=current_user.id
    )

    # 1. Make the creator an official recruiter immediately!
    db.add(
        RecruitmentRecruiterLink(recruitment_id=recruitment.id, user_id=current_user.id)
    )

    if recruiter_ids:
        for fellow_id in recruiter_ids:
            if fellow_id != current_user.id:
                db.add(
                    RecruitmentPendingLink(
                        recruitment_id=recruitment.id, user_id=fellow_id
                    )
                )
                create_notification(
                    session=db,
                    recipient_id=fellow_id,
                    type=NotificationType.VERIFICATION_REQUEST,
                    title="Recruiter Invitation",
                    message=f"{current_user.fullname} invited you to be a recruiter.",
                    link=f"/recruitments/{recruitment.id}",
                    sender_id=current_user.id,
                    related_entity_id=recruitment.id,
                )

    # 2. Move commit outside the IF block so it ALWAYS saves
    db.commit()
    db.refresh(recruitment)

    # 3. Satisfy Pydantic schema fallback
    recruitment.creator = db.get(User, recruitment.creator_id)

    return recruitment


@router.get("/", response_model=List[RecruitmentSummary])
def read_recruitments(
    skip: int = 0, limit: int = 100, db: Session = Depends(get_session)
):
    """Returns a lightweight list of recruitment cards."""
    return get_all_recruitments(session=db, skip=skip, limit=limit)


@router.get("/count")
def get_recruitment_count(db: Session = Depends(get_session)):
    """Returns the total number of recruitments."""
    return {"count": count_recruitments(session=db)}


@router.get("/{recruitment_id}", response_model=RecruitmentPublic)
def read_recruitment(recruitment_id: uuid.UUID, db: Session = Depends(get_session)):
    """Returns the full recruitment post, including all recruiters and applications."""
    recruitment = get_recruitment_by_id(session=db, recruitment_id=recruitment_id)
    if not recruitment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Recruitment not found"
        )
    return recruitment


@router.patch("/{recruitment_id}", response_model=RecruitmentPublic)
def update_existing_recruitment(
    recruitment_id: uuid.UUID,
    recruitment_update: RecruitmentUpdate,
    db: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Updates a post. Only managing recruiters have permission to do this."""
    recruitment = get_recruitment_by_id(session=db, recruitment_id=recruitment_id)
    if not recruitment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Recruitment not found"
        )

    recruiter_ids = [r.id for r in recruitment.recruiters]
    if current_user.id not in recruiter_ids:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only managing recruiters can edit this post.",
        )
    return update_recruitment(
        session=db, db_recruitment=recruitment, recruitment_update=recruitment_update
    )


@router.delete("/{recruitment_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_existing_recruitment(
    recruitment_id: uuid.UUID,
    db: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    recruitment = get_recruitment_by_id(session=db, recruitment_id=recruitment_id)
    if not recruitment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Recruitment not found"
        )
    recruiter_ids = [r.id for r in recruitment.recruiters]
    if current_user.id not in recruiter_ids:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only managing recruiters can delete this post.",
        )
    delete_recruitment(session=db, db_recruitment=recruitment)


# Recruiter management


@router.post("/{recruitment_id}/invites/{user_id}", response_model=RecruitmentPublic)
def invite_recruiter(
    recruitment_id: uuid.UUID,
    user_id: uuid.UUID,
    db: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    recruitment = get_recruitment_by_id(session=db, recruitment_id=recruitment_id)
    if not recruitment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Recruitment not found"
        )
    recruiter_ids = [r.id for r in recruitment.recruiters]
    if current_user.id not in recruiter_ids:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only managing recruiters can invite recruiters.",
        )

    user = db.get(User, user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="User not found"
        )

    already = db.exec(
        select(RecruitmentRecruiterLink).where(
            RecruitmentRecruiterLink.recruitment_id == recruitment_id,
            RecruitmentRecruiterLink.user_id == user_id,
        )
    ).first()
    if already:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User is already a recruiter.",
        )

    already_pending = db.exec(
        select(RecruitmentPendingLink).where(
            RecruitmentPendingLink.recruitment_id == recruitment_id,
            RecruitmentPendingLink.user_id == user_id,
        )
    ).first()
    if already_pending:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User is already invited.",
        )

    link = RecruitmentPendingLink(recruitment_id=recruitment_id, user_id=user_id)
    db.add(link)
    db.commit()
    db.refresh(recruitment)
    recruitment.creator = db.get(User, recruitment.creator_id)

    create_notification(
        session=db,
        recipient_id=user_id,
        type=NotificationType.VERIFICATION_REQUEST,
        title="Recruiter Invitation",
        message=f"{current_user.fullname} invited you to be a recruiter.",
        link=f"/recruitments/{recruitment_id}",
        sender_id=current_user.id,
        related_entity_id=recruitment_id,
    )

    return recruitment


@router.post("/{recruitment_id}/invites/accept", response_model=RecruitmentPublic)
def accept_recruiter_invite(
    recruitment_id: uuid.UUID,
    db: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    recruitment = get_recruitment_by_id(session=db, recruitment_id=recruitment_id)
    if not recruitment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Recruitment not found"
        )

    pending_link = db.exec(
        select(RecruitmentPendingLink).where(
            RecruitmentPendingLink.recruitment_id == recruitment_id,
            RecruitmentPendingLink.user_id == current_user.id,
        )
    ).first()
    if not pending_link:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="No pending invitation found."
        )

    db.delete(pending_link)
    db.add(
        RecruitmentRecruiterLink(recruitment_id=recruitment_id, user_id=current_user.id)
    )
    db.commit()
    db.refresh(recruitment)
    recruitment.creator = db.get(User, recruitment.creator_id)

    create_notification(
        session=db,
        recipient_id=recruitment.creator_id,
        type=NotificationType.VERIFICATION_RESULT,
        title="Recruiter Invitation Accepted",
        message=f"{current_user.fullname} accepted your recruiter invitation.",
        link=f"/recruitments/{recruitment_id}",
        sender_id=current_user.id,
        related_entity_id=recruitment_id,
    )

    return recruitment


@router.post("/{recruitment_id}/invites/reject", response_model=RecruitmentPublic)
def reject_recruiter_invite(
    recruitment_id: uuid.UUID,
    db: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    recruitment = get_recruitment_by_id(session=db, recruitment_id=recruitment_id)
    if not recruitment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Recruitment not found"
        )

    pending_link = db.exec(
        select(RecruitmentPendingLink).where(
            RecruitmentPendingLink.recruitment_id == recruitment_id,
            RecruitmentPendingLink.user_id == current_user.id,
        )
    ).first()
    if not pending_link:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="No pending invitation found."
        )

    db.delete(pending_link)
    db.commit()
    db.refresh(recruitment)
    recruitment.creator = db.get(User, recruitment.creator_id)

    create_notification(
        session=db,
        recipient_id=recruitment.creator_id,
        type=NotificationType.VERIFICATION_RESULT,
        title="Recruiter Invitation Declined",
        message=f"{current_user.fullname} declined your recruiter invitation.",
        link=f"/recruitments/{recruitment_id}",
        sender_id=current_user.id,
        related_entity_id=recruitment_id,
    )

    return recruitment


@router.delete(
    "/{recruitment_id}/recruiters/{user_id}", response_model=RecruitmentPublic
)
def remove_recruiter(
    recruitment_id: uuid.UUID,
    user_id: uuid.UUID,
    db: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    recruitment = get_recruitment_by_id(session=db, recruitment_id=recruitment_id)
    if not recruitment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Recruitment not found"
        )
    recruiter_ids = [r.id for r in recruitment.recruiters]
    if current_user.id not in recruiter_ids:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only managing recruiters can remove recruiters.",
        )
    if user_id == recruitment.creator_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot remove the recruitment creator.",
        )

    link = db.exec(
        select(RecruitmentRecruiterLink).where(
            RecruitmentRecruiterLink.recruitment_id == recruitment_id,
            RecruitmentRecruiterLink.user_id == user_id,
        )
    ).first()
    if not link:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="User is not a recruiter."
        )

    db.delete(link)
    db.commit()
    db.refresh(recruitment)
    recruitment.creator = db.get(User, recruitment.creator_id)

    if current_user.id == user_id:
        create_notification(
            session=db,
            recipient_id=recruitment.creator_id,
            type=NotificationType.VERIFICATION_RESULT,
            title="Recruiter Invitation Declined/Left",
            message=f"{current_user.fullname} has left or declined the recruiter invitation.",
            link=f"/recruitments/{recruitment_id}",
            sender_id=current_user.id,
            related_entity_id=recruitment_id,
        )
    else:
        create_notification(
            session=db,
            recipient_id=user_id,
            type=NotificationType.VERIFICATION_RESULT,
            title="Removed from Recruitment Team",
            message=f"You have been removed from the recruitment team for '{recruitment.title}'.",
            link=f"/recruitments/{recruitment_id}",
            sender_id=current_user.id,
            related_entity_id=recruitment_id,
        )

    return recruitment


# Applications


@router.post(
    "/{recruitment_id}/applications",
    response_model=ApplicationPublic,
    status_code=status.HTTP_201_CREATED,
)
def apply_for_recruitment(
    recruitment_id: uuid.UUID,
    application_in: ApplicationCreate,
    db: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Allows a student to submit an application to an open recruitment post."""
    recruitment = get_recruitment_by_id(session=db, recruitment_id=recruitment_id)

    if not recruitment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Recruitment not found"
        )
    if recruitment.status != "Open":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This recruitment is closed.",
        )
    if application_in.recruitment_id != recruitment_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="URL ID does not match payload ID.",
        )
    application = create_application(
        session=db, app_create=application_in, applicant_id=current_user.id
    )

    create_notification(
        session=db,
        recipient_id=recruitment.creator_id,
        type=NotificationType.NEW_APPLICATION,
        title="New Recruitment Application",
        message=f"{current_user.fullname} applied to your recruitment post.",
        link=f"/recruitments/{recruitment_id}",
        sender_id=current_user.id,
        related_entity_id=application.id,
    )

    return application


@router.patch(
    "/{recruitment_id}/applications/{application_id}", response_model=ApplicationPublic
)
def update_application(
    recruitment_id: uuid.UUID,
    application_id: uuid.UUID,
    status_update: ApplicationUpdate,
    db: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Allows a recruiter to Accept/Reject or update the status of an application."""
    recruitment = get_recruitment_by_id(session=db, recruitment_id=recruitment_id)
    application = get_application_by_id(session=db, application_id=application_id)

    if not recruitment or not application:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Recruitment or Application not found",
        )
    if application.recruitment_id != recruitment_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Application does not belong to this recruitment.",
        )
    if current_user not in recruitment.recruiters:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only managing recruiters can update applications.",
        )
    updated_app = update_application_status(
        session=db, db_application=application, app_update=status_update
    )

    create_notification(
        session=db,
        recipient_id=application.applicant_id,
        type=NotificationType.APPLICATION_RESULT,
        title="Application Status Updated",
        message=f"Your application status was updated to {status_update.status}.",
        link=f"/recruitments/{recruitment_id}",
        sender_id=current_user.id,
        related_entity_id=application.id,
    )

    return updated_app


@router.post("/{recruitment_id}/upload", response_model=RecruitmentPublic)
def upload_recruitment_media(
    recruitment_id: uuid.UUID,
    file: UploadFile = File(...),
    db: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Uploads a file to a specific recruitment folder."""
    recruitment = get_recruitment_by_id(session=db, recruitment_id=recruitment_id)
    if not recruitment:
        raise HTTPException(status_code=404, detail="Recruitment not found")

    recruiter_ids = [r.id for r in recruitment.recruiters]
    if current_user.id not in recruiter_ids:
        raise HTTPException(
            status_code=403, detail="Only managing recruiters can upload media."
        )

    save_dir = os.path.join("uploads", "Recruitments", str(recruitment_id))
    os.makedirs(save_dir, exist_ok=True)

    safe_name = _safe_filename(file.filename)
    file_path = os.path.join(save_dir, safe_name)
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    url_path = f"/recruitments/{recruitment_id}/media/{file.filename}"

    updated_media = list(recruitment.media_urls) if recruitment.media_urls else []
    updated_media.append(url_path)
    recruitment.media_urls = updated_media

    db.add(recruitment)
    db.commit()
    db.refresh(recruitment)
    recruitment.creator = db.get(User, recruitment.creator_id)
    return recruitment


@router.get("/{recruitment_id}/media/{filename}")
def get_recruitment_media(recruitment_id: uuid.UUID, filename: str):
    safe_name = _safe_filename(filename)
    file_path = os.path.join("uploads", "Recruitments", str(recruitment_id), safe_name)
    if not os.path.isfile(file_path):
        raise HTTPException(status_code=404, detail="File not found")
    return FileResponse(file_path)
