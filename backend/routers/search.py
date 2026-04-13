from fastapi import APIRouter, Depends, Query
from sqlmodel import Session
from typing import Optional, List
from core.database import get_session
from core.dependencies import get_current_user
from core.utils import Designation, Degree, Department
from models.user import User
from schemas.search import (
    PaginatedUserResults,
    PaginatedProjectResults,
    PaginatedRecruitmentResults,
    UserSearchResult,
    ProjectSearchResult,
    RecruitmentSearchResult,
)
from crud.search import search_users, search_projects, search_recruitments

router = APIRouter(prefix="/search", tags=["Search"])


@router.get("/users", response_model=PaginatedUserResults)
def search_users_endpoint(
    q: Optional[str] = Query(default=None, description="Search by name or email"),
    designation: Optional[List[Designation]] = Query(default=None),
    degree: Optional[List[Degree]] = Query(default=None),
    department: Optional[List[Department]] = Query(default=None),
    skill: Optional[List[str]] = Query(
        default=None, description="Filter by one or more skills"
    ),
    domain: Optional[List[str]] = Query(
        default=None, description="Filter by one or more domains"
    ),
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """
    Search for users by name/email (full-text) and/or
    filter by designation, degree, or department.

    Example:
        GET /search/users?q=rahul&department=CSE&designation=UG_STUDENT
    """
    results, total = search_users(
        session=session,
        q=q,
        designations=designation,
        degrees=degree,
        departments=department,
        skills=skill,
        domains=domain,
        limit=limit,
        offset=offset,
    )
    return PaginatedUserResults(
        total=total,
        offset=offset,
        limit=limit,
        results=[UserSearchResult.model_validate(u) for u in results],
    )


@router.get("/projects", response_model=PaginatedProjectResults)
def search_projects_endpoint(
    q: Optional[str] = Query(
        default=None, description="Search by title, summary or description"
    ),
    domain: Optional[List[str]] = Query(
        default=None, description="Filter by one or more domains"
    ),
    skill: Optional[List[str]] = Query(
        default=None, description="Filter by one or more skills"
    ),
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """
    Search for projects by full-text query and/or domain.

    Example:
        GET /search/projects?q=machine+learning&domain=AI
    """
    results, total = search_projects(
        session=session,
        q=q,
        domains=domain,
        skills=skill,
        limit=limit,
        offset=offset,
    )
    return PaginatedProjectResults(
        total=total,
        offset=offset,
        limit=limit,
        results=[
            ProjectSearchResult(
                id=p["id"],
                title=p["title"],
                summary=p["summary"],
                domains=p["domains"],
                creator_id=p["creator_id"],
                created_at=p["created_at"],
                creator_name=p["creator_name"],
                creator_avatar_url=p["creator_avatar_url"],
                member_count=p["member_count"],
            )
            for p in results
        ],
    )


@router.get("/recruitments", response_model=PaginatedRecruitmentResults)
def search_recruitments_endpoint(
    q: Optional[str] = Query(
        default=None, description="Search by title or description"
    ),
    domain: Optional[List[str]] = Query(
        default=None, description="Filter by one or more domains"
    ),
    designation: Optional[List[str]] = Query(
        default=None, description="Filter by one or more allowed designations"
    ),
    department: Optional[List[str]] = Query(
        default=None, description="Filter by one or more allowed departments"
    ),
    skill: Optional[List[str]] = Query(
        default=None, description="Filter by one or more skills"
    ),
    prerequisite: Optional[List[str]] = Query(
        default=None, description="Filter by one or more prerequisites"
    ),
    status: Optional[str] = Query(
        default="Open", description="Filter by status: Open or Closed"
    ),
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """
    Search for recruitments by full-text query, domain, prerequisite and status.

    Example:
        GET /search/recruitments?q=backend&domain=Web+Dev&status=Open
    """
    results, total = search_recruitments(
        session=session,
        q=q,
        domains=domain,
        designations=designation,
        departments=department,
        skills=skill,
        prerequisites=prerequisite,
        status=status,
        limit=limit,
        offset=offset,
    )
    return PaginatedRecruitmentResults(
        total=total,
        offset=offset,
        limit=limit,
        results=[
            RecruitmentSearchResult(
                id=r["id"],
                title=r["title"],
                domains=r["domains"],
                prerequisites=r["prerequisites"],
                allowed_designations=r["allowed_designations"],
                allowed_departments=r["allowed_departments"],
                status=r["status"],
                created_at=r["created_at"],
                recruiters=r["recruiters"],
                creator_id=r["creator_id"],
                creator_name=r["creator_name"],
                creator_avatar_url=r["creator_avatar_url"],
            )
            for r in results
        ],
    )
