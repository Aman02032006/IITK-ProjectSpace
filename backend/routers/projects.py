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
from models.project import ProjectTeamLink, ProjectPendingLink

from schemas.project import ProjectCreate, ProjectUpdate, ProjectPublic, ProjectSummary
from crud.project import (
    create_project,
    get_project_by_id,
    get_all_projects,
    count_projects,
    update_project,
    delete_project,
    add_user_to_project_team,
)
from crud.notification import create_notification
from core.utils import NotificationType

router = APIRouter(prefix="/projects", tags=["Projects"])


def _safe_filename(filename: str) -> str:
    if not filename:
        raise HTTPException(status_code=400, detail="Filename is required")
    safe_name = os.path.basename(filename.strip())
    if not safe_name or safe_name in {".", ".."} or safe_name != filename:
        raise HTTPException(status_code=400, detail="Invalid filename")
    return safe_name


@router.post("/", response_model=ProjectPublic, status_code=status.HTTP_201_CREATED)
def create_new_project(
    project_in: ProjectCreate,
    db: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Creates a new project and automatically adds the user to the team."""
    member_ids = project_in.team_member_ids or []
    project_in.team_member_ids = []

    project = create_project(
        session=db, project_create=project_in, creator_id=current_user.id
    )

    db.add(ProjectTeamLink(project_id=project.id, user_id=current_user.id))

    if member_ids:
        for member_id in member_ids:
            if member_id != current_user.id:
                db.add(ProjectPendingLink(project_id=project.id, user_id=member_id))
                create_notification(
                    session=db,
                    recipient_id=member_id,
                    type=NotificationType.VERIFICATION_REQUEST,
                    title="Project Team Invitation",
                    message=f"{current_user.fullname} invited you to join their project team.",
                    link=f"/projects/{project.id}",
                    sender_id=current_user.id,
                    related_entity_id=project.id,
                )

    db.commit()
    db.refresh(project)

    project.creator = db.get(User, project.creator_id)

    return project


@router.get("/", response_model=List[ProjectSummary])
def read_projects(skip: int = 0, limit: int = 100, db: Session = Depends(get_session)):
    return get_all_projects(session=db, skip=skip, limit=limit)


@router.get("/count")
def get_project_count(db: Session = Depends(get_session)):
    """Returns the total number of projects."""
    return {"count": count_projects(session=db)}


@router.get("/{project_id}", response_model=ProjectPublic)
def read_project(project_id: uuid.UUID, db: Session = Depends(get_session)):
    """Returns the full project details, including the names of team members."""
    project = get_project_by_id(session=db, project_id=project_id)
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Project not found"
        )
    return project


@router.patch("/{project_id}", response_model=ProjectPublic)
def update_existing_project(
    project_id: uuid.UUID,
    project_update: ProjectUpdate,
    db: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    project = get_project_by_id(session=db, project_id=project_id)
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Project not found"
        )
    if current_user not in project.team_members:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only team members can edit this project.",
        )
    return update_project(session=db, db_project=project, project_update=project_update)


@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_existing_project(
    project_id: uuid.UUID,
    db: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    project = get_project_by_id(session=db, project_id=project_id)
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Project not found"
        )
    if current_user not in project.team_members:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only team members can delete this project.",
        )
    delete_project(session=db, db_project=project)


# --- Team member management ---


@router.post("/{project_id}/invites/{user_id}", response_model=ProjectPublic)
def invite_project_member(
    project_id: uuid.UUID,
    user_id: uuid.UUID,
    db: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    project = get_project_by_id(session=db, project_id=project_id)
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Project not found"
        )
    if current_user not in project.team_members:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only team members can invite members.",
        )

    user = db.get(User, user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="User not found"
        )

    already_member = db.exec(
        select(ProjectTeamLink).where(
            ProjectTeamLink.project_id == project_id,
            ProjectTeamLink.user_id == user_id,
        )
    ).first()
    if already_member:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User is already a team member.",
        )

    already_pending = db.exec(
        select(ProjectPendingLink).where(
            ProjectPendingLink.project_id == project_id,
            ProjectPendingLink.user_id == user_id,
        )
    ).first()
    if already_pending:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User is already invited.",
        )

    db.add(ProjectPendingLink(project_id=project_id, user_id=user_id))
    db.commit()
    db.refresh(project)
    project.creator = db.get(User, project.creator_id)

    create_notification(
        session=db,
        recipient_id=user_id,
        type=NotificationType.VERIFICATION_REQUEST,
        title="Project Team Invitation",
        message=f"{current_user.fullname} invited you to join their project team.",
        link=f"/projects/{project_id}",
        sender_id=current_user.id,
        related_entity_id=project_id,
    )

    return project


@router.post("/{project_id}/invites/accept", response_model=ProjectPublic)
def accept_project_invite(
    project_id: uuid.UUID,
    db: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    project = get_project_by_id(session=db, project_id=project_id)
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Project not found"
        )

    pending_link = db.exec(
        select(ProjectPendingLink).where(
            ProjectPendingLink.project_id == project_id,
            ProjectPendingLink.user_id == current_user.id,
        )
    ).first()
    if not pending_link:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="No pending invitation found."
        )

    db.delete(pending_link)
    db.add(ProjectTeamLink(project_id=project_id, user_id=current_user.id))
    db.commit()
    db.refresh(project)
    project.creator = db.get(User, project.creator_id)

    create_notification(
        session=db,
        recipient_id=project.creator_id,
        type=NotificationType.VERIFICATION_RESULT,
        title="Team Invitation Accepted",
        message=f"{current_user.fullname} accepted your team invitation.",
        link=f"/projects/{project_id}",
        sender_id=current_user.id,
        related_entity_id=project_id,
    )

    return project


@router.post("/{project_id}/invites/reject", response_model=ProjectPublic)
def reject_project_invite(
    project_id: uuid.UUID,
    db: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    project = get_project_by_id(session=db, project_id=project_id)
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Project not found"
        )

    pending_link = db.exec(
        select(ProjectPendingLink).where(
            ProjectPendingLink.project_id == project_id,
            ProjectPendingLink.user_id == current_user.id,
        )
    ).first()
    if not pending_link:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="No pending invitation found."
        )

    db.delete(pending_link)
    db.commit()
    db.refresh(project)
    project.creator = db.get(User, project.creator_id)

    create_notification(
        session=db,
        recipient_id=project.creator_id,
        type=NotificationType.VERIFICATION_RESULT,
        title="Team Invitation Declined",
        message=f"{current_user.fullname} declined your team invitation.",
        link=f"/projects/{project_id}",
        sender_id=current_user.id,
        related_entity_id=project_id,
    )

    return project


@router.delete("/{project_id}/members/{user_id}", response_model=ProjectPublic)
def remove_project_member(
    project_id: uuid.UUID,
    user_id: uuid.UUID,
    db: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    project = get_project_by_id(session=db, project_id=project_id)
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Project not found"
        )

    # FIX 1: Safely check if current user is authorized by comparing IDs
    team_ids = [member.id for member in project.team_members]
    if current_user.id not in team_ids:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only team members can remove members.",
        )

    # Your excellent safeguard!
    if user_id == project.creator_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot remove the project creator.",
        )

    link = db.exec(
        select(ProjectTeamLink).where(
            ProjectTeamLink.project_id == project_id,
            ProjectTeamLink.user_id == user_id,
        )
    ).first()

    if not link:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="User is not a team member."
        )

    db.delete(link)
    db.commit()
    db.refresh(project)

    # Satisfy Pydantic schema fallback
    project.creator = db.get(User, project.creator_id)

    # FIX 2: Handle both notification scenarios
    if current_user.id == user_id:
        # Scenario A: User left voluntarily -> Notify the creator
        create_notification(
            session=db,
            recipient_id=project.creator_id,
            type=NotificationType.VERIFICATION_RESULT,
            title="Team Member Left",
            message=f"{current_user.fullname} has voluntarily left the team.",
            link=f"/projects/{project_id}",
            sender_id=current_user.id,
            related_entity_id=project_id,
        )
    else:
        # Scenario B: Creator removed someone -> Notify the removed user
        create_notification(
            session=db,
            recipient_id=user_id,
            type=NotificationType.VERIFICATION_RESULT,
            title="Removed from Project",
            message=f"You have been removed from the project '{project.title}'.",
            link=f"/projects/{project_id}",
            sender_id=current_user.id,
            related_entity_id=project_id,
        )

    return project


@router.post("/{project_id}/upload", response_model=ProjectPublic)
def upload_project_media(
    project_id: uuid.UUID,
    file: UploadFile = File(...),
    db: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Uploads a file to a specific project folder."""
    project = get_project_by_id(session=db, project_id=project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    # SECURITY: Only team members can upload!
    if current_user not in project.team_members:
        raise HTTPException(
            status_code=403, detail="Only team members can upload media."
        )

    # Create the specific project folder
    save_dir = os.path.join("uploads", "Projects", str(project_id))
    os.makedirs(save_dir, exist_ok=True)

    # Save the physical file using its original name
    safe_name = _safe_filename(file.filename)
    file_path = os.path.join(save_dir, safe_name)
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    # Format URL to point to our new media serving endpoint
    url_path = f"/projects/{project_id}/media/{safe_name}"

    # In SQLModel/SQLAlchemy, you must create a new list to trigger the DB update for arrays
    updated_media = list(project.media_urls) if project.media_urls else []
    updated_media.append(url_path)
    project.media_urls = updated_media

    db.add(project)
    db.commit()
    db.refresh(project)
    project.creator = db.get(User, project.creator_id)
    return project


@router.get("/{project_id}/media/{filename}")
def get_project_media(project_id: uuid.UUID, filename: str):
    safe_name = _safe_filename(filename)
    file_path = os.path.join("uploads", "Projects", str(project_id), safe_name)
    if not os.path.isfile(file_path):
        raise HTTPException(status_code=404, detail="File not found")
    return FileResponse(file_path)
