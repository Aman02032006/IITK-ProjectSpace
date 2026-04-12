from sqlmodel import Session, select, func
from sqlalchemy.orm import selectinload
from fastapi import HTTPException, status
from models.recruitment import Recruitment, Application, RecruitmentRecruiterLink
from models.user import User
from schemas.recruitment import (
    RecruitmentCreate,
    RecruitmentUpdate,
    ApplicationCreate,
    ApplicationUpdate,
)
from core.utils import now
import uuid
from typing import Sequence

## Recruitment CRUD


def create_recruitment(
    session: Session,
    recruitment_create: RecruitmentCreate,
    creator_id: uuid.UUID,
) -> Recruitment:
    """Creates a new recruitment post and populates the Many-to-Many recruiter links."""
    db_recruitment = Recruitment(
        title=recruitment_create.title,
        description=recruitment_create.description,
        description_format=recruitment_create.description_format,
        domains=recruitment_create.domains,
        prerequisites=recruitment_create.prerequisites,
        allowed_designations=recruitment_create.allowed_designations,
        allowed_departments=recruitment_create.allowed_departments,
        links=recruitment_create.links,
        media_urls=recruitment_create.media_urls,
        status=recruitment_create.status,
        creator_id=creator_id,
    )

    session.add(db_recruitment)
    session.flush()

    # Add the creator as the first recruiter
    creator_link = RecruitmentRecruiterLink(
        recruitment_id=db_recruitment.id, user_id=creator_id
    )
    session.add(creator_link)

    seen_recruiter_ids: set[uuid.UUID] = {creator_id}
    if hasattr(recruitment_create, "recruiter_ids") and recruitment_create.recruiter_ids:
        for fellow_id in recruitment_create.recruiter_ids:
            if fellow_id not in seen_recruiter_ids:
                fellow_link = RecruitmentRecruiterLink(
                    recruitment_id=db_recruitment.id, user_id=fellow_id
                )
                session.add(fellow_link)
                seen_recruiter_ids.add(fellow_id)

    session.flush()
    session.refresh(db_recruitment)
    # Explicitly load creator so the response schema can read it
    db_recruitment.creator = session.get(User, creator_id)

    return db_recruitment


def get_recruitment_by_id(
    session: Session, recruitment_id: uuid.UUID
) -> Recruitment | None:
    statement = (
        select(Recruitment)
        .where(Recruitment.id == recruitment_id)
        .options(
            selectinload(Recruitment.creator),
            selectinload(Recruitment.recruiters),
            selectinload(Recruitment.pending_recruiters),
        )
    )
    return session.exec(statement).first()


def get_all_recruitments(
    session: Session, skip: int = 0, limit: int = 10
) -> Sequence[Recruitment]:
    statement = (
        select(Recruitment)
        .order_by(Recruitment.created_at.desc())
        .offset(skip)
        .limit(limit)
        .options(
            selectinload(Recruitment.creator),
            selectinload(Recruitment.recruiters),
        )
    )
    return session.exec(statement).all()


def count_recruitments(session: Session) -> int:
    statement = select(func.count()).select_from(Recruitment)
    return session.exec(statement).one()


def recruitment_exists(session: Session, recruitment_id: uuid.UUID) -> bool:
    return (
        session.exec(
            select(Recruitment.id).where(Recruitment.id == recruitment_id).limit(1)
        ).first()
        is not None
    )


def update_recruitment(
    session: Session, db_recruitment: Recruitment, recruitment_update: RecruitmentUpdate
) -> Recruitment:
    update_data = recruitment_update.model_dump(exclude_unset=True)

    for key, value in update_data.items():
        setattr(db_recruitment, key, value)

    db_recruitment.updated_at = now()

    session.add(db_recruitment)
    session.flush()
    session.refresh(db_recruitment)
    if db_recruitment.creator is None:
        db_recruitment.creator = session.get(User, db_recruitment.creator_id)

    return db_recruitment


def delete_recruitment(session: Session, db_recruitment: Recruitment) -> None:
    session.query(Application).filter(
        Application.recruitment_id == db_recruitment.id
    ).delete()
    session.delete(db_recruitment)


## Application CRUD


def create_application(
    session: Session, app_create: ApplicationCreate, applicant_id: uuid.UUID
) -> Application:
    """Creates a new application while explicitly preventing spam/duplicate submissions."""
    existing = session.exec(
        select(Application)
        .where(Application.recruitment_id == app_create.recruitment_id)
        .where(Application.applicant_id == applicant_id)
    ).first()

    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="You have already applied to this recruitment.",
        )

    db_application = Application(
        recruitment_id=app_create.recruitment_id,
        applicant_id=applicant_id,
        message=app_create.message,
        status="Pending",
    )

    session.add(db_application)
    session.flush()
    session.refresh(db_application)

    return db_application


def get_application_by_id(
    session: Session, application_id: uuid.UUID
) -> Application | None:
    return session.get(Application, application_id)


def get_recruitment_applications(
    session: Session,
    recruitment_id: uuid.UUID,
    skip: int = 0,
    limit: int = 100,
) -> Sequence[Application]:
    statement = (
        select(Application)
        .where(Application.recruitment_id == recruitment_id)
        .order_by(Application.applied_at.desc())
        .offset(skip)
        .limit(limit)
        .options(selectinload(Application.applicant))
    )
    return session.exec(statement).all()


def get_my_recruitment_application(
    session: Session,
    recruitment_id: uuid.UUID,
    applicant_id: uuid.UUID,
) -> Application | None:
    statement = (
        select(Application)
        .where(Application.recruitment_id == recruitment_id)
        .where(Application.applicant_id == applicant_id)
        .options(selectinload(Application.recruitment))
    )
    return session.exec(statement).first()


def update_application_status(
    session: Session, db_application: Application, app_update: ApplicationUpdate
) -> Application:
    if db_application.status != "Pending":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Application status is already finalized and cannot be changed.",
        )

    db_application.status = app_update.status

    session.add(db_application)
    session.flush()
    session.refresh(db_application)

    return db_application
