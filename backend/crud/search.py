from sqlmodel import Session, select, func
from typing import List, Tuple, Any
from sqlalchemy import or_
from models.user import User
from models.project import Project, ProjectTeamLink
from models.recruitment import Recruitment, RecruitmentRecruiterLink
from core.utils import Designation, Degree, Department
import re


def _build_prefix_tsquery(raw_query: str) -> str | None:
    """
    Build a safe Postgres prefix tsquery string:
    "machine learn" -> "machine:* & learn:*"
    """
    terms = re.split(r"\s+", raw_query.strip().lower())
    tokens: List[str] = []
    for term in terms:
        cleaned = re.sub(r"[^a-z0-9_]+", "", term)
        if cleaned:
            tokens.append(f"{cleaned}:*")
    if not tokens:
        return None
    return " & ".join(tokens)


# User Search
def search_users(
    session: Session,
    q: str | None,
    designations: List[Designation] | None,
    degrees: List[Degree] | None,
    departments: List[Department] | None,
    skills: List[str] | None,
    domains: List[str] | None,
    limit: int,
    offset: int,
) -> Tuple[List[User], int]:
    """
    Search users by full-text query (name + email) and/or
    enum filters (designation, degree, department) using pre-computed TSVector.
    """
    statement = select(User).where(User.is_active == True)
    rank_expr = None

    # Prefix full-text search + substring fallback
    if q:
        query = q.strip()
        tsquery_raw = _build_prefix_tsquery(query)

        if tsquery_raw:
            tsquery = func.to_tsquery("english", tsquery_raw)
            rank_expr = func.coalesce(func.ts_rank(User.search_vector, tsquery), 0)
            statement = statement.where(
                or_(
                    User.search_vector.op("@@")(tsquery),
                    User.fullname.ilike(f"%{query}%"),
                    User.iitk_email.ilike(f"%{query}%"),
                )
            )
        else:
            statement = statement.where(
                or_(
                    User.fullname.ilike(f"%{query}%"),
                    User.iitk_email.ilike(f"%{query}%"),
                )
            )

    # Enum filters
    if designations:
        statement = statement.where(User.designation.in_(designations))
    if degrees:
        statement = statement.where(User.degree.in_(degrees))
    if departments:
        statement = statement.where(User.department.in_(departments))
    if skills:
        statement = statement.where(User.skills.op("&&")(skills))
    if domains:
        statement = statement.where(User.domains.op("&&")(domains))

    # Total count before pagination
    count_stmt = select(func.count()).select_from(statement.subquery())
    total = session.exec(count_stmt).one()

    # Rank by relevance when a text query is present
    if q:
        if rank_expr is not None:
            statement = statement.order_by(rank_expr.desc(), User.created_at.desc())
        else:
            statement = statement.order_by(User.created_at.desc())
    else:
        statement = statement.order_by(User.created_at.desc())

    statement = statement.offset(offset).limit(limit)
    results = session.exec(statement).all()

    return results, total


# Project Search
def search_projects(
    session: Session,
    q: str | None,
    domains: List[str] | None,
    skills: List[str] | None,
    limit: int,
    offset: int,
) -> Tuple[List[dict[str, Any]], int]:
    """
    Search projects by full-text query (title + summary + description)
    and/or domain filter (ARRAY overlap check), returning projected card fields.
    """
    filters = []
    rank_expr = None

    if q:
        query = q.strip()
        tsquery_raw = _build_prefix_tsquery(query)

        if tsquery_raw:
            tsquery = func.to_tsquery("english", tsquery_raw)
            rank_expr = func.coalesce(func.ts_rank(Project.search_vector, tsquery), 0)
            filters.append(
                or_(
                    Project.search_vector.op("@@")(tsquery),
                    Project.title.ilike(f"%{query}%"),
                    Project.summary.ilike(f"%{query}%"),
                    Project.description.ilike(f"%{query}%"),
                )
            )
        else:
            filters.append(
                or_(
                    Project.title.ilike(f"%{query}%"),
                    Project.summary.ilike(f"%{query}%"),
                    Project.description.ilike(f"%{query}%"),
                )
            )

    if domains:
        filters.append(Project.domains.op("&&")(domains))

    if skills:
        skill_terms = [
            or_(
                Project.title.ilike(f"%{skill}%"),
                Project.summary.ilike(f"%{skill}%"),
                Project.description.ilike(f"%{skill}%"),
                Project.domains.contains([skill]),
            )
            for skill in skills
            if skill
        ]
        if skill_terms:
            filters.append(or_(*skill_terms))

    total = session.exec(
        select(func.count()).select_from(Project).where(*filters)
    ).one()

    statement = (
        select(
            Project.id.label("id"),
            Project.title.label("title"),
            Project.summary.label("summary"),
            Project.domains.label("domains"),
            Project.creator_id.label("creator_id"),
            Project.created_at.label("created_at"),
            User.fullname.label("creator_name"),
            User.profile_picture_url.label("creator_avatar_url"),
            func.count(func.distinct(ProjectTeamLink.user_id)).label("member_count"),
        )
        .select_from(Project)
        .join(User, User.id == Project.creator_id, isouter=True)
        .join(ProjectTeamLink, ProjectTeamLink.project_id == Project.id, isouter=True)
        .where(*filters)
        .group_by(
            Project.id,
            Project.title,
            Project.summary,
            Project.domains,
            Project.creator_id,
            Project.created_at,
            User.fullname,
            User.profile_picture_url,
        )
    )

    if q and rank_expr is not None:
        statement = statement.order_by(rank_expr.desc(), Project.created_at.desc())
    else:
        statement = statement.order_by(Project.created_at.desc())

    rows = session.exec(statement.offset(offset).limit(limit)).all()

    results = [
        {
            "id": row.id,
            "title": row.title,
            "summary": row.summary,
            "domains": row.domains or [],
            "creator_id": row.creator_id,
            "created_at": row.created_at,
            "creator_name": row.creator_name or "",
            "creator_avatar_url": row.creator_avatar_url,
            "member_count": int(row.member_count or 0),
        }
        for row in rows
    ]

    return results, total


# Recruitment Search
def search_recruitments(
    session: Session,
    q: str | None,
    domains: List[str] | None,
    designations: List[str] | None,
    departments: List[str] | None,
    skills: List[str] | None,
    prerequisites: List[str] | None,
    status: str | None,
    limit: int,
    offset: int,
) -> Tuple[List[dict[str, Any]], int]:
    """
    Search recruitments by full-text query and filters,
    returning projected card fields.
    """
    filters = []
    rank_expr = None

    if q:
        query = q.strip()
        tsquery_raw = _build_prefix_tsquery(query)

        if tsquery_raw:
            tsquery = func.to_tsquery("english", tsquery_raw)
            rank_expr = func.coalesce(
                func.ts_rank(Recruitment.search_vector, tsquery), 0
            )
            filters.append(
                or_(
                    Recruitment.search_vector.op("@@")(tsquery),
                    Recruitment.title.ilike(f"%{query}%"),
                    Recruitment.description.ilike(f"%{query}%"),
                )
            )
        else:
            filters.append(
                or_(
                    Recruitment.title.ilike(f"%{query}%"),
                    Recruitment.description.ilike(f"%{query}%"),
                )
            )

    if domains:
        filters.append(Recruitment.domains.op("&&")(domains))
    if designations:
        filters.append(Recruitment.allowed_designations.op("&&")(designations))
    if departments:
        filters.append(Recruitment.allowed_departments.op("&&")(departments))

    if skills:
        skill_terms = [
            or_(
                Recruitment.title.ilike(f"%{skill}%"),
                Recruitment.description.ilike(f"%{skill}%"),
                Recruitment.prerequisites.contains([skill]),
            )
            for skill in skills
            if skill
        ]
        if skill_terms:
            filters.append(or_(*skill_terms))

    if prerequisites:
        filters.append(Recruitment.prerequisites.op("&&")(prerequisites))

    if status:
        filters.append(Recruitment.status == status)

    total = session.exec(
        select(func.count()).select_from(Recruitment).where(*filters)
    ).one()

    recruiters_expr = func.array_remove(
        func.array_agg(func.distinct(RecruitmentRecruiterLink.user_id)), None
    )

    statement = (
        select(
            Recruitment.id.label("id"),
            Recruitment.title.label("title"),
            Recruitment.domains.label("domains"),
            Recruitment.prerequisites.label("prerequisites"),
            Recruitment.allowed_designations.label("allowed_designations"),
            Recruitment.allowed_departments.label("allowed_departments"),
            Recruitment.status.label("status"),
            Recruitment.created_at.label("created_at"),
            Recruitment.creator_id.label("creator_id"),
            User.fullname.label("creator_name"),
            User.profile_picture_url.label("creator_avatar_url"),
            recruiters_expr.label("recruiters"),
        )
        .select_from(Recruitment)
        .join(User, User.id == Recruitment.creator_id, isouter=True)
        .join(
            RecruitmentRecruiterLink,
            RecruitmentRecruiterLink.recruitment_id == Recruitment.id,
            isouter=True,
        )
        .where(*filters)
        .group_by(
            Recruitment.id,
            Recruitment.title,
            Recruitment.domains,
            Recruitment.prerequisites,
            Recruitment.allowed_designations,
            Recruitment.allowed_departments,
            Recruitment.status,
            Recruitment.created_at,
            Recruitment.creator_id,
            User.fullname,
            User.profile_picture_url,
        )
    )

    if q and rank_expr is not None:
        statement = statement.order_by(rank_expr.desc(), Recruitment.created_at.desc())
    else:
        statement = statement.order_by(Recruitment.created_at.desc())

    rows = session.exec(statement.offset(offset).limit(limit)).all()

    results = [
        {
            "id": row.id,
            "title": row.title,
            "domains": row.domains or [],
            "prerequisites": row.prerequisites or [],
            "allowed_designations": row.allowed_designations or [],
            "allowed_departments": row.allowed_departments or [],
            "status": row.status,
            "created_at": row.created_at,
            "recruiters": list(row.recruiters or []),
            "creator_id": row.creator_id,
            "creator_name": row.creator_name or "",
            "creator_avatar_url": row.creator_avatar_url,
        }
        for row in rows
    ]

    return results, total
