from sqlmodel import Session, select, func
from sqlalchemy.orm import selectinload
from models.project import Project, ProjectTeamLink
from models.user import User
from models.comments import Comment
from schemas.project import ProjectCreate, ProjectUpdate
from datetime import datetime
import uuid
from typing import Sequence


def create_project(
    session: Session, project_create: ProjectCreate, creator_id: uuid.UUID
) -> Project:
    db_project = Project(
        title=project_create.title,
        summary=project_create.summary,
        description=project_create.description,
        description_format=project_create.description_format,
        domains=project_create.domains,
        links=project_create.links,
        media_urls=project_create.media_urls,
        creator_id=creator_id,
    )

    session.add(db_project)
    session.commit()
    session.refresh(db_project)

    # Automatically add the creator to the project's team
    add_user_to_project_team(session, project_id=db_project.id, user_id=creator_id)

    for user_id in project_create.team_member_ids:
        if user_id != creator_id:
            add_user_to_project_team(session, project_id=db_project.id, user_id=user_id)

    session.refresh(db_project)
    # Explicitly load creator so the response schema can read it
    db_project.creator = session.get(User, creator_id)

    return db_project


def get_project_by_id(session: Session, project_id: uuid.UUID) -> Project | None:
    statement = (
        select(Project)
        .where(Project.id == project_id)
        .options(selectinload(Project.comments).selectinload(Comment.author))
    )
    project = session.exec(statement).first()
    if project and project.creator is None:
        project.creator = session.get(User, project.creator_id)
    if project:
        for comment in project.comments:
            comment.reply_count = session.exec(
                select(func.count())
                .select_from(Comment)
                .where(Comment.parent_id == comment.id)
            ).one()
    return project


def get_all_projects(
    session: Session, skip: int = 0, limit: int = 10
) -> Sequence[Project]:
    statement = (
        select(Project)
        .order_by(Project.created_at.desc())
        .offset(skip)
        .limit(limit)
        .options(
            selectinload(Project.creator),
            selectinload(Project.comments).selectinload(Comment.author),
        )
    )
    projects = session.exec(statement).all()
    for project in projects:
        for comment in project.comments:
            comment.reply_count = session.exec(
                select(func.count())
                .select_from(Comment)
                .where(Comment.parent_id == comment.id)
            ).one()
    return projects


def count_projects(session: Session) -> int:
    statement = select(func.count()).select_from(Project)
    return session.exec(statement).one()


def update_project(
    session: Session, db_project: Project, project_update: ProjectUpdate
) -> Project:
    update_data = project_update.model_dump(exclude_unset=True)

    for key, value in update_data.items():
        setattr(db_project, key, value)

    db_project.updated_at = datetime.utcnow()

    session.add(db_project)
    session.commit()
    session.refresh(db_project)
    if db_project.creator is None:
        db_project.creator = session.get(User, db_project.creator_id)

    return db_project


def delete_project(session: Session, db_project: Project) -> None:
    session.delete(db_project)
    session.commit()


def add_user_to_project_team(
    session: Session, project_id: uuid.UUID, user_id: uuid.UUID
):
    team_link = ProjectTeamLink(project_id=project_id, user_id=user_id)
    session.add(team_link)
    session.commit()
    return team_link
