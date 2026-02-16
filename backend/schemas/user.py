from pydantic import BaseModel, EmailStr, Field, HttpUrl
from typing import Optional, List
import uuid
from datetime import datetime
from core.utils import Degree, Department, Designation

# Base User Model (Editable and Shared fields only)


class UserBase(BaseModel):

    fullname: str = None
    iitk_email: EmailStr


# Registeration


class UserCreate(UserBase):
    password: str = Field(min_length=8, max_length=20)


# Login


class UserLogin(BaseModel):
    iitk_email: EmailStr
    password: str


# Edit Profile
class UserUpdate(BaseModel):

    fullname: Optional[str] = None
    secondary_email: Optional[EmailStr] = None

    profile_picture_url: Optional[str] = None
    bio: Optional[str] = Field(default=None, max_length=1000)

    github: Optional[HttpUrl] = None
    linkedin: Optional[HttpUrl] = None
    other_link1: Optional[HttpUrl] = None
    other_link2: Optional[HttpUrl] = None

    designation: Optional[Designation] = Designation.NA
    degree: Optional[Degree] = Degree.NA
    department: Optional[Department] = Department.NA

    skills: Optional[List[str]] = None
    domains: Optional[List[str]] = None


class UserPublic(UserBase):
    id: uuid.UUID
    
    secondary_email: Optional[EmailStr] = None
    designation: Designation
    degree: Degree
    department: Department
    
    bio: str = ""
    profile_picture_url: Optional[str] = None
    
    github: Optional[HttpUrl] = None
    linkedin: Optional[HttpUrl] = None
    other_link1: Optional[HttpUrl] = None
    other_link2: Optional[HttpUrl] = None
    
    skills: List[str] = []
    domains: List[str] = []

    is_active: bool
    is_admin: bool
    created_at: datetime

    class Config:
        from_attributes = True
