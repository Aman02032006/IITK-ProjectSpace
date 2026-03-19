from sqlmodel import Session, select
from models.project import Project, ProjectTeamLink
from schemas.project import ProjectCreate, ProjectUpdate
from datetime import datetime
import uuid
from typing import Sequence

def create_project(session: Session, project_create: ProjectCreate, creator_id: uuid.UUID) -> Project:
    db_project = Project.model_validate(project_create)
    db_project.creator_id = creator_id
    
    session.add(db_project)
    session.commit()
    session.refresh(db_project)

    # Automatically add the creator to the project's team
    add_user_to_project_team(session, project_id=db_project.id, user_id=creator_id)

    for user_id in project_create.team_member_ids:
        if user_id != creator_id:
            add_user_to_project_team(session, project_id=db_project.id, user_id=user_id)

    return db_project

def get_project_by_id(session: Session, project_id: uuid.UUID) -> Project | None:
    return session.get(Project, project_id)

def get_all_projects(session: Session, skip: int = 0, limit: int = 10) -> Sequence[Project]:
    statement = select(Project).order_by(Project.created_at.desc()).offset(skip).limit(limit)
    return session.exec(statement).all()

def update_project(session: Session, db_project: Project, project_update: ProjectUpdate) -> Project:
    update_data = project_update.model_dump(exclude_unset=True)

    for key, value in update_data.items():
        setattr(db_project, key, value)

    db_project.updated_at = datetime.utcnow() # Trigger timestamp update

    session.add(db_project)
    session.commit()
    session.refresh(db_project)

    return db_project

def delete_project(session: Session, db_project: Project) -> None:
    session.delete(db_project)
    session.commit()

def add_user_to_project_team(session: Session, project_id: uuid.UUID, user_id: uuid.UUID):
    team_link = ProjectTeamLink(project_id=project_id, user_id=user_id)
    session.add(team_link)
    session.commit()
    return team_link