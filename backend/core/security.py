from datetime import datetime, timedelta
from typing import Optional

from jose import jwt
from passlib.context import CryptContext
from sqlmodel import Session

from core.config import settings
from core.database import engine
from core import utils


# Set up the bcrypt hashing algorithm for password
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Matches the hash of the plain password typed in with the hashed_password we store
def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    '''
    Creates a JSON Web Token (JWT) that acts as the user's session pass.
    
    :param data: A dictionary containing the user's identifier {"sub": user.email}
    :param expires_delta: Optional custom lifespan for the token.
    '''
    to_encode = data.copy()

    if expires_delta:
        expire = utils.now() + expires_delta
    else:
        expire = utils.now() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE)

    to_encode.update({"exp": expire})

    # Secures the token with the SECRET_KEY
    encoded_jwt = jwt.encode(
        to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM
    )
    return encoded_jwt


def get_session():
    with Session(engine) as session:
        try:
            yield session
        except Exception:
            session.rollback()
            raise
