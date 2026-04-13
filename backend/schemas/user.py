from pydantic import BaseModel, EmailStr, Field, HttpUrl, field_validator
from typing import Optional, List
import uuid
import re
from datetime import datetime
from core.utils import Degree, Department, Designation


def validate_fullname_chars(v: Optional[str]) -> Optional[str]:
    if v is not None:
        # Only allow letters, spaces, dots, hyphens, and apostrophes
        if not re.fullmatch(r"^[A-Za-z\s\.\-']+$", v):
            raise ValueError(
                "Full name can only contain letters, spaces, dots, hyphens, and apostrophes."
            )
    return v


def validate_password_strength(v: str) -> str:
    if not re.search(r"[A-Z]", v):
        raise ValueError("Password must contain at least one uppercase letter.")
    if not re.search(r"[a-z]", v):
        raise ValueError("Password must contain at least one lowercase letter.")
    if not re.search(r"\d", v):
        raise ValueError("Password must contain at least one number.")
    if not re.search(r"[!@#$%^&*(),.?\":{}|<>_\-+=\[\]\\;'/`~]", v):
        raise ValueError("Password must contain at least one special character.")
    return v


# Base User Model (Editable and Shared fields only)


class UserBase(BaseModel):

    fullname: Optional[str] = None
    iitk_email: EmailStr

    @field_validator("fullname")
    @classmethod
    def validate_fullname(cls, v: Optional[str]) -> Optional[str]:
        return validate_fullname_chars(v)

    @field_validator("iitk_email")
    @classmethod
    def validate_iitk_domain(cls, v: str) -> str:
        if not v.endswith("@iitk.ac.in"):
            raise ValueError("Only IITK Emails are allowed during registration.")
        return v


# Secondary Email


class SecondaryEmailRequest(BaseModel):
    secondary_email: EmailStr


class SecondaryEmailVerify(BaseModel):
    secondary_email: EmailStr
    otp_code: str


# OTP Verification
class OTPVerify(BaseModel):
    iitk_email: EmailStr
    otp_code: str
    password: str = Field(min_length=8, max_length=20)

    @field_validator("password")
    @classmethod
    def password_strength(cls, v: str) -> str:
        return validate_password_strength(v)


class OTPCheck(BaseModel):
    iitk_email: EmailStr
    otp_code: str
    purpose: str


# Forgot Password


class ForgotPasswordRequest(BaseModel):
    iitk_email: EmailStr

    @field_validator("iitk_email")
    @classmethod
    def validate_iitk_domain(cls, v: str) -> str:
        if not v.endswith("@iitk.ac.in"):
            raise ValueError("Only IITK Emails are allowed for Password Resets.")
        return v


class ForgotPasswordVerify(BaseModel):
    iitk_email: EmailStr
    otp_code: str
    new_password: str = Field(min_length=8, max_length=20)

    @field_validator("new_password")
    @classmethod
    def password_strength(cls, v: str) -> str:
        return validate_password_strength(v)


# Registeration


class UserCreate(UserBase):
    password: str = Field(min_length=8, max_length=20)

    @field_validator("password")
    @classmethod
    def password_strength(cls, v: str) -> str:
        return validate_password_strength(v)


# Login


class UserLogin(BaseModel):
    identifier: str  # can be either email or username
    password: str


# Edit Profile
class UserUpdate(BaseModel):

    fullname: Optional[str] = Field(default=None, max_length=64)
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

    @field_validator("fullname")
    @classmethod
    def validate_fullname(cls, v: Optional[str]) -> Optional[str]:
        return validate_fullname_chars(v)


# what frontend gets for one's own profile
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
    created_at: datetime

    class Config:
        from_attributes = True


# To view someone else's profile
class UserProfileView(UserBase):
    id: uuid.UUID

    secondary_email: Optional[EmailStr] = None
    designation: Designation
    degree: Degree
    department: Department

    bio: str = ""
    profile_picture_url: Optional[str] = None

    skills: List[str] = []
    domains: List[str] = []

    github: Optional[HttpUrl] = None
    linkedin: Optional[HttpUrl] = None
    other_link1: Optional[HttpUrl] = None
    other_link2: Optional[HttpUrl] = None

    class Config:
        from_attributes = True
