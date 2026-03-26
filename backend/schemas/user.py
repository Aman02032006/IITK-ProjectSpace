from pydantic import BaseModel, EmailStr, Field, HttpUrl, field_validator
from typing import Optional, List
import uuid
from datetime import datetime
from core.utils import Degree, Department, Designation

# Base User Model (Editable and Shared fields only)


class UserBase(BaseModel):

    fullname: Optional[str] = None
    iitk_email: EmailStr

    @field_validator("iitk_email")
    @classmethod
    def validate_iitk_domain(cls, v: str) -> str:
        if not v.endswith("@iitk.ac.in"):
            raise ValueError("Only IITK Emails are allowed during registration.")
        return v


# OTP Verification
class OTPVerify(BaseModel):
    iitk_email: EmailStr
    otp_code: str
    password: str = Field(min_length=8, max_length=20)


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
    new_password: str = Field(min_length=8, max_length=40)


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
