from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlmodel import Session
from typing import List
import uuid
import os
import shutil

from core.database import get_session
from core.dependencies import get_current_user
from models.user import User

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
    update_recruitment,
    delete_recruitment,
    create_application,
    get_application_by_id,
    update_application_status,
)

router = APIRouter(prefix="/recruitments", tags=["Recruitments"])


@router.post("/", response_model=RecruitmentPublic, status_code=status.HTTP_201_CREATED)
def create_new_recruitment(
    recruitment_in: RecruitmentCreate,
    db: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Creates a new recruitment post and makes the user the lead recruiter."""
    return create_recruitment(
        session=db, recruitment_create=recruitment_in, creator_id=current_user.id
    )


@router.get("/", response_model=List[RecruitmentSummary])
def read_recruitments(
    skip: int = 0, limit: int = 100, db: Session = Depends(get_session)
):
    """Returns a lightweight list of recruitment cards."""
    return get_all_recruitments(session=db, skip=skip, limit=limit)


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

    # SECURITY CHECK
    if current_user not in recruitment.recruiters:
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
    """Deletes a post. Only managing recruiters have permission to do this."""
    recruitment = get_recruitment_by_id(session=db, recruitment_id=recruitment_id)
    if not recruitment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Recruitment not found"
        )

    # SECURITY CHECK
    if current_user not in recruitment.recruiters:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only managing recruiters can delete this post.",
        )

    delete_recruitment(session=db, db_recruitment=recruitment)
    return {"ok": True}


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

    return create_application(
        session=db, application_create=application_in, applicant_id=current_user.id
    )


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

    return update_application_status(
        session=db, db_application=application, status_update=status_update
    )


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

    if current_user not in recruitment.recruiters:
        raise HTTPException(
            status_code=403, detail="Only managing recruiters can upload media."
        )

    save_dir = os.path.join("uploads", "Recruitments", str(recruitment_id))
    os.makedirs(save_dir, exist_ok=True)

    file_path = os.path.join(save_dir, file.filename)
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    url_path = f"/{file_path}".replace("\\", "/")

    updated_media = list(recruitment.media_urls) if recruitment.media_urls else []
    updated_media.append(url_path)
    recruitment.media_urls = updated_media

    db.add(recruitment)
    db.commit()
    db.refresh(recruitment)

    return recruitment
