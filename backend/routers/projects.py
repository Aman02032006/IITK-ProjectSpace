from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlmodel import Session
from typing import List
import uuid
import os
import shutil

from core.database import get_session
from core.dependencies import get_current_user
from models.user import User

from schemas.project import ProjectCreate, ProjectUpdate, ProjectPublic, ProjectSummary
from crud.project import (
    create_project,
    get_project_by_id,
    get_all_projects,
    update_project,
    delete_project,
)

router = APIRouter(prefix="/projects", tags=["Projects"])


@router.post("/", response_model=ProjectPublic, status_code=status.HTTP_201_CREATED)
def create_new_project(
    project_in: ProjectCreate,
    db: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Creates a new project and automatically adds the user to the team."""
    return create_project(
        session=db, project_create=project_in, creator_id=current_user.id
    )


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
    """Updates a project. Only team members have permission to do this."""
    project = get_project_by_id(session=db, project_id=project_id)
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Project not found"
        )

    # SECURITY CHECK: Egalitarian access!
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
    """Deletes a project. Only team members have permission to do this."""
    project = get_project_by_id(session=db, project_id=project_id)
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Project not found"
        )

    # SECURITY CHECK: Egalitarian access!
    if current_user not in project.team_members:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only team members can delete this project.",
        )

    delete_project(session=db, db_project=project)
    return {"ok": True}


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
    file_path = os.path.join(save_dir, file.filename)
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    # Format URL and update the database array
    url_path = f"/{file_path}".replace("\\", "/")

    # In SQLModel/SQLAlchemy, you must create a new list to trigger the DB update for arrays
    updated_media = list(project.media_urls) if project.media_urls else []
    updated_media.append(url_path)
    project.media_urls = updated_media

    db.add(project)
    db.commit()
    db.refresh(project)

    return project
