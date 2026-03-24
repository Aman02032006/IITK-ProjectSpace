from sqlmodel import Session, select, func
from typing import List, Tuple
from sqlalchemy import or_
from models.user import User
from models.project import Project
from models.recruitments import Recruitment
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
) -> Tuple[List[Project], int]:
    """
    Search projects by full-text query (title + summary + description)
    and/or domain filter (ARRAY contains check) using pre-computed TSVector.
    """
    statement = select(Project)
    rank_expr = None

    # Prefix full-text search + substring fallback
    if q:
        query = q.strip()
        tsquery_raw = _build_prefix_tsquery(query)

        if tsquery_raw:
            tsquery = func.to_tsquery("english", tsquery_raw)
            rank_expr = func.coalesce(func.ts_rank(Project.search_vector, tsquery), 0)
            statement = statement.where(
                or_(
                    Project.search_vector.op("@@")(tsquery),
                    Project.title.ilike(f"%{query}%"),
                    Project.summary.ilike(f"%{query}%"),
                    Project.description.ilike(f"%{query}%"),
                )
            )
        else:
            statement = statement.where(
                or_(
                    Project.title.ilike(f"%{query}%"),
                    Project.summary.ilike(f"%{query}%"),
                    Project.description.ilike(f"%{query}%"),
                )
            )

    # Domain filter — checks if the domain string is in the ARRAY column
    if domains:
        statement = statement.where(Project.domains.op("&&")(domains))
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
            statement = statement.where(or_(*skill_terms))

    # Total count before pagination
    count_stmt = select(func.count()).select_from(statement.subquery())
    total = session.exec(count_stmt).one()

    # Rank by relevance when a text query is present
    if q:
        if rank_expr is not None:
            statement = statement.order_by(rank_expr.desc(), Project.created_at.desc())
        else:
            statement = statement.order_by(Project.created_at.desc())
    else:
        statement = statement.order_by(Project.created_at.desc())

    statement = statement.offset(offset).limit(limit)
    results = session.exec(statement).all()

    for r in results:
        if r.creator is None:
            r.creator = session.get(User, r.creator_id)

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
) -> Tuple[List[Recruitment], int]:
    """
    Search recruitments by full-text query (title + description),
    domain filter, prerequisite filter and status using pre-computed TSVector.
    """
    statement = select(Recruitment)
    rank_expr = None

    # Prefix full-text search + substring fallback
    if q:
        query = q.strip()
        tsquery_raw = _build_prefix_tsquery(query)

        if tsquery_raw:
            tsquery = func.to_tsquery("english", tsquery_raw)
            rank_expr = func.coalesce(func.ts_rank(Recruitment.search_vector, tsquery), 0)
            statement = statement.where(
                or_(
                    Recruitment.search_vector.op("@@")(tsquery),
                    Recruitment.title.ilike(f"%{query}%"),
                    Recruitment.description.ilike(f"%{query}%"),
                )
            )
        else:
            statement = statement.where(
                or_(
                    Recruitment.title.ilike(f"%{query}%"),
                    Recruitment.description.ilike(f"%{query}%"),
                )
            )

    # ARRAY contains filters
    if domains:
        statement = statement.where(Recruitment.domains.op("&&")(domains))
    if designations:
        statement = statement.where(
            Recruitment.allowed_designations.op("&&")(designations)
        )
    if departments:
        statement = statement.where(
            Recruitment.allowed_departments.op("&&")(departments)
        )
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
            statement = statement.where(or_(*skill_terms))
    if prerequisites:
        statement = statement.where(Recruitment.prerequisites.op("&&")(prerequisites))

    # Status filter (defaults to "Open" from schema)
    if status:
        statement = statement.where(Recruitment.status == status)

    # Total count before pagination
    count_stmt = select(func.count()).select_from(statement.subquery())
    total = session.exec(count_stmt).one()

    # Rank by relevance when a text query is present
    if q:
        if rank_expr is not None:
            statement = statement.order_by(
                rank_expr.desc(), Recruitment.created_at.desc()
            )
        else:
            statement = statement.order_by(Recruitment.created_at.desc())
    else:
        statement = statement.order_by(Recruitment.created_at.desc())

    statement = statement.offset(offset).limit(limit)
    results = session.exec(statement).all()

    return results, total
