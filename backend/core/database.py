from sqlmodel import SQLModel, create_engine, Session
from core.config import settings

from models.user import User
from models.otp import OTPVerification
from models.project import Project, ProjectTeamLink
from models.recruitments import Application, Recruitment, RecruitmentRecruiterLink
from models.comments import Comment
from models.notification import Notification

if not settings.DATABASE_URL:
    raise ValueError("DATABASE_URL is missing. Check .env file in the backend folder.")

engine = create_engine(settings.DATABASE_URL, echo=True)


def get_session():
    with Session(engine) as session:
        yield session


def create_db_and_tables():
    SQLModel.metadata.create_all(engine)
