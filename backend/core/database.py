import logging
from sqlmodel import SQLModel, create_engine, Session
from sqlalchemy import text
from core.config import settings

from models.user import User
from models.otp import OTPVerification
from models.project import Project, ProjectTeamLink
from models.recruitment import Application, Recruitment, RecruitmentRecruiterLink
from models.comment import Comment
from models.notification import Notification

if not settings.DATABASE_URL:
    raise ValueError("DATABASE_URL is missing. Check .env file in the backend folder.")

logging.basicConfig()
logger = logging.getLogger("sqlalchemy.engine")

if settings.DEBUG:
    logger.setLevel(logging.INFO)   # logs SQL queries
else:
    logger.setLevel(logging.WARNING)  # suppresses noise
    
engine = create_engine(settings.DATABASE_URL, echo=False)


def get_session():
    with Session(engine) as session:
        try:
            yield session
        except Exception:
            session.rollback()
            raise


def create_db_and_tables():
    SQLModel.metadata.create_all(engine)
    _ensure_performance_indexes()


def _ensure_performance_indexes() -> None:
    # Existing databases won't get newly added indexes from metadata.create_all().
    # Keep index creation idempotent and lightweight on startup.
    if engine.dialect.name != "postgresql":
        return

    statements = [
        "CREATE INDEX IF NOT EXISTS ix_comment_project_id ON comment (project_id)",
        "CREATE INDEX IF NOT EXISTS ix_comment_recruitment_id ON comment (recruitment_id)",
        "CREATE INDEX IF NOT EXISTS ix_comment_parent_created_at ON comment (parent_id, created_at)",
        "CREATE INDEX IF NOT EXISTS ix_user_skills_gin ON \"user\" USING gin (skills)",
        "CREATE INDEX IF NOT EXISTS ix_user_domains_gin ON \"user\" USING gin (domains)",
        "CREATE INDEX IF NOT EXISTS ix_project_domains_gin ON project USING gin (domains)",
        "CREATE INDEX IF NOT EXISTS ix_recruitment_domains_gin ON recruitment USING gin (domains)",
        "CREATE INDEX IF NOT EXISTS ix_recruitment_prerequisites_gin ON recruitment USING gin (prerequisites)",
        "CREATE INDEX IF NOT EXISTS ix_recruitment_allowed_designations_gin ON recruitment USING gin (allowed_designations)",
        "CREATE INDEX IF NOT EXISTS ix_recruitment_allowed_departments_gin ON recruitment USING gin (allowed_departments)",
        "CREATE INDEX IF NOT EXISTS ix_application_recruitment_id ON application (recruitment_id)",
        "CREATE INDEX IF NOT EXISTS ix_application_applicant_id ON application (applicant_id)",
        "CREATE INDEX IF NOT EXISTS ix_application_recruitment_applicant ON application (recruitment_id, applicant_id)",
        "CREATE INDEX IF NOT EXISTS ix_application_recruitment_applied_at ON application (recruitment_id, applied_at)",
    ]

    with engine.begin() as connection:
        for statement in statements:
            connection.execute(text(statement))
