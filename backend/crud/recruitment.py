from sqlmodel import Session, select
from models.recruitments import Recruitment, Application, RecruitmentRecruiterLink
from schemas.recruitments import RecruitmentCreate, RecruitmentUpdate, ApplicationCreate, ApplicationUpdate
from datetime import datetime
import uuid
from typing import Sequence

## Recruitment CRUD

def create_recruitment(session: Session, recruitment_create: RecruitmentCreate, creator_id: uuid.UUID) -> Recruitment:
    db_recruitment = Recruitment.model_validate(recruitment_create)
    
    session.add(db_recruitment)
    session.commit()
    session.refresh(db_recruitment)

    # Add the creator as the first recruiter
    creator_link = RecruitmentRecruiterLink(recruitment_id=db_recruitment.id, user_id=creator_id)
    session.add(creator_link)

    if hasattr(recruitment_create, "recruiter_ids") and recruitment_create.recruiter_ids:
        for fellow_id in recruitment_create.recruiter_ids:
            if fellow_id != creator_id:
                fellow_link = RecruitmentRecruiterLink(recruitment_id=db_recruitment.id, user_id=fellow_id)
                session.add(fellow_link)

    session.commit()
    session.refresh(db_recruitment)

    return db_recruitment

def get_recruitment_by_id(session: Session, recruitment_id: uuid.UUID) -> Recruitment | None:
    return session.get(Recruitment, recruitment_id)

def get_all_recruitments(session: Session, skip: int = 0, limit: int = 10) -> Sequence[Recruitment]:
    statement = select(Recruitment).order_by(Recruitment.created_at.desc()).offset(skip).limit(limit)
    return session.exec(statement).all()

def update_recruitment(session: Session, db_recruitment: Recruitment, recruitment_update: RecruitmentUpdate) -> Recruitment:
    update_data = recruitment_update.model_dump(exclude_unset=True)

    for key, value in update_data.items():
        setattr(db_recruitment, key, value)

    db_recruitment.updated_at = datetime.utcnow()

    session.add(db_recruitment)
    session.commit()
    session.refresh(db_recruitment)

    return db_recruitment

def delete_recruitment(session: Session, db_recruitment: Recruitment) -> None:
    session.delete(db_recruitment)
    session.commit()

## Application CRUD

def create_application(session: Session, app_create: ApplicationCreate, applicant_id: uuid.UUID) -> Application:
    # We map the frontend schema to the DB model, and attach the logged-in user's ID
    db_application = Application(
        recruitment_id=app_create.recruitment_id,
        applicant_id=applicant_id,
        message=app_create.message,
        status="Pending" # Default status
    )

    session.add(db_application)
    session.commit()
    session.refresh(db_application)

    return db_application

def get_application_by_id(session: Session, application_id: uuid.UUID) -> Application | None:
    return session.get(Application, application_id)

def update_application_status(session: Session, db_application: Application, app_update: ApplicationUpdate) -> Application:
    # This specifically targets the ApplicationUpdate schema which only allows updating the 'status'
    db_application.status = app_update.status
    
    session.add(db_application)
    session.commit()
    session.refresh(db_application)
    
    return db_application
