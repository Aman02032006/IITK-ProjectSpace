from sqlmodel import Session, select, func
from fastapi import HTTPException, status
from models.recruitments import Recruitment, Application, RecruitmentRecruiterLink
from models.user import User
from schemas.recruitments import (
    RecruitmentCreate,
    RecruitmentUpdate,
    ApplicationCreate,
    ApplicationUpdate,
)
from datetime import datetime
import uuid
from typing import Sequence

## Recruitment CRUD


def create_recruitment(
    session: Session, recruitment_create: RecruitmentCreate, creator_id: uuid.UUID
) -> Recruitment:
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
    session.commit()
    session.refresh(db_recruitment)

    # Add the creator as the first recruiter
    creator_link = RecruitmentRecruiterLink(
        recruitment_id=db_recruitment.id, user_id=creator_id
    )
    session.add(creator_link)

    if (
        hasattr(recruitment_create, "recruiter_ids")
        and recruitment_create.recruiter_ids
    ):
        for fellow_id in recruitment_create.recruiter_ids:
            if fellow_id != creator_id:
                fellow_link = RecruitmentRecruiterLink(
                    recruitment_id=db_recruitment.id, user_id=fellow_id
                )
                session.add(fellow_link)

    session.commit()
    session.refresh(db_recruitment)
    # Explicitly load creator so the response schema can read it
    db_recruitment.creator = session.get(User, creator_id)

    return db_recruitment


def get_recruitment_by_id(
    session: Session, recruitment_id: uuid.UUID
) -> Recruitment | None:
    recruitment = session.get(Recruitment, recruitment_id)
    if recruitment and recruitment.creator is None:
        recruitment.creator = session.get(User, recruitment.creator_id)
    return recruitment


def get_all_recruitments(
    session: Session, skip: int = 0, limit: int = 10
) -> Sequence[Recruitment]:
    statement = (
        select(Recruitment)
        .order_by(Recruitment.created_at.desc())
        .offset(skip)
        .limit(limit)
    )
    recruitments = session.exec(statement).all()
    for r in recruitments:
        if r.creator is None:
            r.creator = session.get(User, r.creator_id)
    return recruitments


def count_recruitments(session: Session) -> int:
    statement = select(func.count()).select_from(Recruitment)
    return session.exec(statement).one()


def update_recruitment(
    session: Session, db_recruitment: Recruitment, recruitment_update: RecruitmentUpdate
) -> Recruitment:
    update_data = recruitment_update.model_dump(exclude_unset=True)

    for key, value in update_data.items():
        setattr(db_recruitment, key, value)

    db_recruitment.updated_at = datetime.utcnow()

    session.add(db_recruitment)
    session.commit()
    session.refresh(db_recruitment)
    if db_recruitment.creator is None:
        db_recruitment.creator = session.get(User, db_recruitment.creator_id)

    return db_recruitment


def delete_recruitment(session: Session, db_recruitment: Recruitment) -> None:
    session.query(Application).filter(
        Application.recruitment_id == db_recruitment.id
    ).delete()
    session.delete(db_recruitment)
    session.commit()


## Application CRUD


def create_application(
    session: Session, app_create: ApplicationCreate, applicant_id: uuid.UUID
) -> Application:
    # Prevent duplicate applications from the same user to the same recruitment
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
    session.commit()
    session.refresh(db_application)

    return db_application


def get_application_by_id(
    session: Session, application_id: uuid.UUID
) -> Application | None:
    return session.get(Application, application_id)


def update_application_status(
    session: Session, db_application: Application, app_update: ApplicationUpdate
) -> Application:
    db_application.status = app_update.status

    session.add(db_application)
    session.commit()
    session.refresh(db_application)

    return db_application
