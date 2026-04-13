from sqlmodel import Session, select
from models.user import User
from schemas.user import UserCreate, UserUpdate
from core.security import get_password_hash
import uuid

'''Creates a new user and saves the hashed password'''
def create_user(session: Session, user_create: UserCreate) -> User:
    db_user = User(
        iitk_email=user_create.iitk_email,
        secondary_email=None,
        fullname=user_create.fullname,
        hashed_password=get_password_hash(user_create.password),
    )

    session.add(db_user)
    session.flush()
    session.refresh(db_user)

    return db_user


'''Getting User according to Email and ID'''
def get_user_by_email(session: Session, email: str) -> User | None:
    statement = select(User).where(User.iitk_email == email)
    return session.exec(statement).first()


def get_user_by_id(session: Session, user_id: uuid.UUID) -> User | None:
    return session.get(User, user_id)


'''Updating user Details'''
def update_user(session: Session, db_user: User, user_update: UserUpdate) -> User:
    # exclude_unset=True is used so that if frontend only sends one field (like fullname),
    # it doesn't accidentally overwrite other fields with null values
    update_data = user_update.model_dump(exclude_unset=True)

    for key, value in update_data.items():
        if (
            key in ["linkedin", "github", "other_link1", "other_link2"]
            and value is not None
        ):
            setattr(db_user, key, str(value))
        else:
            setattr(db_user, key, value)

    session.add(db_user)
    session.flush()
    session.refresh(db_user)

    return db_user
