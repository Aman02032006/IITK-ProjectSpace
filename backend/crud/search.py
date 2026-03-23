from sqlmodel import Session, select, func
from typing import List, Tuple
from models.user import User
from models.project import Project
from models.recruitments import Recruitment
from core.utils import Designation, Degree, Department

# ─────────────────────────────────────────────
# User Search
# ─────────────────────────────────────────────


def search_users(
    session: Session,
    q: str | None,
    designation: Designation | None,
    degree: Degree | None,
    department: Department | None,
    skill: str | None,
    limit: int,
    offset: int,
) -> Tuple[List[User], int]:
    """
    Search users by full-text query (name + email) and/or
    enum filters (designation, degree, department).

    Uses the pre-computed TSVector column `search_vector` for full-text search.
    Enum filters are applied as exact-match WHERE clauses.
    """
    statement = select(User).where(User.is_active == True)

    # Full-text search via TSVector
    if q:
        tsquery = func.plainto_tsquery("english", q)
        statement = statement.where(User.search_vector.op("@@")(tsquery))

    # Enum filters
    if designation:
        statement = statement.where(User.designation == designation)
    if degree:
        statement = statement.where(User.degree == degree)
    if department:
        statement = statement.where(User.department == department)
    if skill:
        statement = statement.where(User.skills.contains([skill]))

    # Total count before pagination
    count_stmt = select(func.count()).select_from(statement.subquery())
    total = session.exec(count_stmt).one()

    # Rank by relevance when a text query is present
    if q:
        tsquery = func.plainto_tsquery("english", q)
        statement = statement.order_by(func.ts_rank(User.search_vector, tsquery).desc())
    else:
        statement = statement.order_by(User.created_at.desc())

    statement = statement.offset(offset).limit(limit)
    results = session.exec(statement).all()

    for p in results:
        if p.creator is None:
            p.creator = session.get(User, p.creator_id)

    return results, total


# ─────────────────────────────────────────────
# Project Search
# ─────────────────────────────────────────────


def search_projects(
    session: Session,
    q: str | None,
    domain: str | None,
    limit: int,
    offset: int,
) -> Tuple[List[Project], int]:
    """
    Search projects by full-text query (title + summary + description)
    and/or domain filter (ARRAY contains check).

    Uses the pre-computed TSVector column `search_vector` for full-text search.
    """
    statement = select(Project)

    # Full-text search via TSVector
    if q:
        tsquery = func.plainto_tsquery("english", q)
        statement = statement.where(Project.search_vector.op("@@")(tsquery))

    # Domain filter — checks if the domain string is in the ARRAY column
    if domain:
        statement = statement.where(Project.domains.contains([domain]))

    # Total count before pagination
    count_stmt = select(func.count()).select_from(statement.subquery())
    total = session.exec(count_stmt).one()

    # Rank by relevance when a text query is present
    if q:
        tsquery = func.plainto_tsquery("english", q)
        statement = statement.order_by(
            func.ts_rank(Project.search_vector, tsquery).desc()
        )
    else:
        statement = statement.order_by(Project.created_at.desc())

    statement = statement.offset(offset).limit(limit)
    results = session.exec(statement).all()

    for r in results:
        if r.creator is None:
            r.creator = session.get(User, r.creator_id)

    return results, total


# ─────────────────────────────────────────────
# Recruitment Search
# ─────────────────────────────────────────────


def search_recruitments(
    session: Session,
    q: str | None,
    domain: str | None,
    prerequisite: str | None,
    status: str | None,
    limit: int,
    offset: int,
) -> Tuple[List[Recruitment], int]:
    """
    Search recruitments by full-text query (title + description),
    domain filter, prerequisite filter and status.

    Uses the pre-computed TSVector column `search_vector` for full-text search.
    """
    statement = select(Recruitment)

    # Full-text search via TSVector
    if q:
        tsquery = func.plainto_tsquery("english", q)
        statement = statement.where(Recruitment.search_vector.op("@@")(tsquery))

    # ARRAY contains filters
    if domain:
        statement = statement.where(Recruitment.domains.contains([domain]))
    if prerequisite:
        statement = statement.where(Recruitment.prerequisites.contains([prerequisite]))

    # Status filter (defaults to "Open" from schema)
    if status:
        statement = statement.where(Recruitment.status == status)

    # Total count before pagination
    count_stmt = select(func.count()).select_from(statement.subquery())
    total = session.exec(count_stmt).one()

    # Rank by relevance when a text query is present
    if q:
        tsquery = func.plainto_tsquery("english", q)
        statement = statement.order_by(
            func.ts_rank(Recruitment.search_vector, tsquery).desc()
        )
    else:
        statement = statement.order_by(Recruitment.created_at.desc())

    statement = statement.offset(offset).limit(limit)
    results = session.exec(statement).all()

    return results, total
