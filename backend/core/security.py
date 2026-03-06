from datetime import datetime, timedelta
from typing import Optional

from jose import JWTError,jwt
from passlib.context import CryptContext
from fastapi import Depends, HTTPException
from fastapi.security import OAuth2PasswordBearer
from sqlmodel import Session, select

# Importing the config settings
from core.config import settings
from core.database import engine
from models.user import User

pwd_context = CryptContext(schemes = ["bcrypt"], deprecated = "auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()

    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes = settings.ACCESS_TOKEN_EXPIRE)
    
    to_encode.update({"exp": expire})

    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm = settings.ALGORITHM)
    return encoded_jwt

def get_session():
    with Session(engine) as session:
        yield session

def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_session),
) -> User:
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise HTTPException(status_code=401, detail="Invalid token")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

    user = db.exec(select(User).where(User.iitk_email == email)).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user