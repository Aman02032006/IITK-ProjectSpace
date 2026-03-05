from sqlmodel import SQLModel, Field
from datetime import datetime, timedelta
import uuid


class OTPVerification(SQLModel, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)

    email: str = Field(index=True, max_length=255)
    full_name: str = Field(max_length=64)

    otp_code: str = Field(max_length=6)
    purpose: str = Field(default="register", max_length=20)
    expires_at: datetime
