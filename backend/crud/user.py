from sqlmodel import Session, select
from models.user import User
from schemas.user import UserCreate, UserUpdate
from core.security import get_password_hash
import uuid

## Creating User


def create_user(session: Session, user_create: UserCreate) -> User:
    db_user = User(
        iitk_email=user_create.iitk_email,
        fullname=user_create.fullname,
        hashed_password=get_password_hash(user_create.password),
    )

    session.add(db_user)
    session.commit()
    session.refresh(db_user)

    return db_user


## Getting User according to Email and ID


def get_user_by_email(session: Session, email: str) -> User | None:
    statement = select(User).where(User.iitk_email == email)
    return session.exec(statement).first()


def get_user_by_id(session: Session, user_id: uuid.UUID) -> User | None:
    return session.get(User, user_id)


## Updating user Details


def update_user(session: Session, db_user: User, user_update: UserUpdate) -> User:
    update_data = user_update.model_dump(exclude_unset=True)

    for key, value in update_data.items():
        setattr(db_user, key, value)

    session.add(db_user)
    session.commit()
    session.refresh(db_user)

    return db_user