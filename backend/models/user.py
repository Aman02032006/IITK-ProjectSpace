from sqlmodel import SQLModel, Field, Relationship
from sqlalchemy import Column, String
from sqlalchemy.dialects.postgresql import ARRAY
from typing import Optional, List
from datetime import datetime
import uuid

from core.utils import Degree, Department, Designation


class User(SQLModel, table=True):

    # Unique Credentials
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    fullname: str = Field(default=None, max_length=64)
    iitk_email: str = Field(unique=True, index=True, max_length=255)
    secondary_email: Optional[str] = Field(unique=True, index=True, max_length=255)
    hashed_password: str = Field(nullable=False)

    # Academic Details
    designation: Designation = Field(default=Designation.NA)
    degree: Degree = Field(default=Degree.NA)
    department: Department = Field(default=Department.NA)

    # Social Links
    github: Optional[str] = Field(default=None, max_length=255)
    linkedin: Optional[str] = Field(default=None, max_length=255)
    other_link1: Optional[str] = Field(default=None, max_length=255)
    other_link2: Optional[str] = Field(default=None, max_length=255)

    # Profile Data
    bio: str = Field(default="", max_length=1000)
    skills: List[str] = Field(default=[], sa_column=Column(ARRAY(String)))
    domains: List[str] = Field(default=[], sa_column=Column(ARRAY(String)))

    # Profile Picture
    profile_picture_url: Optional[str] = Field(default=None, max_length=512)

    # Auth flags
    is_active: bool = Field(default=False)
    is_admin: bool = Field(default=False)

    # Timestamps
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
