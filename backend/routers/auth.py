from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
from sqlmodel import Session, select, or_
from datetime import datetime, timedelta
from core.utils import now
import secrets

from core.database import engine
from models.otp import OTPVerification
from models.user import User

from schemas.user import (
    UserCreate,
    UserPublic,
    UserLogin,
    UserBase,
    OTPVerify,
    OTPCheck,
    ForgotPasswordRequest,
    ForgotPasswordVerify,
)
from crud.user import create_user, get_user_by_email
from core.security import verify_password, create_access_token, get_password_hash
from core.email import send_otp_email

router = APIRouter(prefix="/auth", tags=["Authentication"])


def get_session():
    with Session(engine) as session:
        try:
            yield session
        except Exception:
            session.rollback()
            raise


# Requesting OTP Endpoint
@router.post("/request-otp", status_code=status.HTTP_201_CREATED)
async def request_otp(
    request_data: UserBase,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_session),
):
    if not request_data.fullname or not request_data.fullname.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Full name is required to request registration OTP.",
        )

    # Prevent users from registering an email that is already active
    if get_user_by_email(session=db, email=request_data.iitk_email):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered."
        )

    # Clean up any old, unverified OTP requests for this email to prevent spam
    existing_otp = db.exec(
        select(OTPVerification).where(OTPVerification.email == request_data.iitk_email)
    ).first()
    if existing_otp:
        db.delete(existing_otp)
        db.commit()

    otp_code = "".join([str(secrets.randbelow(10)) for _ in range(6)])

    new_otp = OTPVerification(
        email=request_data.iitk_email,
        full_name=request_data.fullname.strip(),
        otp_code=otp_code,
        purpose="register",
        expires_at=now() + timedelta(minutes=10),
    )
    db.add(new_otp)
    db.commit()

    # Queue OTP email in the background so the request returns quickly.
    background_tasks.add_task(
        send_otp_email,
        email_to=request_data.iitk_email,
        otp_code=otp_code,
        name=request_data.fullname.strip(),
        purpose="register",
    )
    return {"message": "Verification code sent successfully."}


# Verifying OTP Endpoint
@router.post("/verify-otp", status_code=status.HTTP_201_CREATED)
def verify_otp(verify_data: OTPVerify, db: Session = Depends(get_session)):

    otp_record = db.exec(
        select(OTPVerification)
        .where(OTPVerification.email == verify_data.iitk_email)
        .where(OTPVerification.purpose == "register")
    ).first()

    if not otp_record:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No verification request found.",
        )

    if otp_record.otp_code != verify_data.otp_code:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid verification code."
        )

    # Security check: Ensure the OTP hasn't expired
    if otp_record.expires_at < now():
        db.delete(otp_record)
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Verification code has expired. Please request a new one.",
        )

    # OTP is valid. Create the permanent user account
    new_user_data = UserCreate(
        fullname=otp_record.full_name,
        iitk_email=otp_record.email,
        password=verify_data.password,
    )

    db_user = create_user(session=db, user_create=new_user_data)
    db_user.is_active = True
    db.delete(otp_record)
    db.commit()

    return {"message": "Account created successfully!"}


@router.post("/check-otp", status_code=status.HTTP_200_OK)
def check_otp(check_data: OTPCheck, db: Session = Depends(get_session)):
    """Utility endpoint to verify an OTP without consuming it (useful for multi-step frontend forms)."""
    otp_record = db.exec(
        select(OTPVerification)
        .where(OTPVerification.email == check_data.iitk_email)
        .where(OTPVerification.purpose == check_data.purpose)
    ).first()

    if not otp_record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No verification request found.",
        )

    if otp_record.otp_code != check_data.otp_code:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid verification code."
        )

    if otp_record.expires_at < now():
        db.delete(otp_record)
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Verification code has expired.",
        )

    return {"message": "OTP is valid."}


# Login Endpoint
@router.post("/login")
def login_user(user_credentials: UserLogin, db: Session = Depends(get_session)):

    # Normalise identifier if only username was entered
    identifier = user_credentials.identifier.strip()
    if "@" not in identifier:
        identifier = f"{identifier}@iitk.ac.in"

    statement = select(User).where(
        or_(
            User.iitk_email == identifier,
            User.secondary_email == identifier
        )
    )

    db_user = db.exec(statement).first()

    if not db_user or not verify_password(
        user_credentials.password, db_user.hashed_password
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid Email or Password"
        )

    access_token = create_access_token(data={"sub": db_user.iitk_email})

    return {"access_token": access_token, "token_type": "bearer"}


# Forgot Password Initiation
@router.post("/forgot-password", status_code=status.HTTP_200_OK)
async def forgot_password(
    request_data: ForgotPasswordRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_session),
):
    """Initiates the password reset flow by sending a 'reset' OTP."""

    db_user = get_user_by_email(session=db, email=request_data.iitk_email)
    if not db_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Account with this email does not exist.",
        )

    existing_otp = db.exec(
        select(OTPVerification)
        .where(OTPVerification.email == request_data.iitk_email)
        .where(OTPVerification.purpose == "reset")
    ).first()

    if existing_otp:
        db.delete(existing_otp)
        db.commit()

    otp_code = "".join([str(secrets.randbelow(10)) for _ in range(6)])

    new_otp = OTPVerification(
        email=db_user.iitk_email,
        full_name=db_user.fullname,
        otp_code=otp_code,
        purpose="reset",
        expires_at=now() + timedelta(minutes=10),
    )
    db.add(new_otp)
    db.commit()

    background_tasks.add_task(
        send_otp_email,
        email_to=db_user.iitk_email,
        otp_code=otp_code,
        name=db_user.fullname,
        purpose="reset",
    )

    return {"message": "Password reset verification code sent successfully."}


# Password Reset
@router.post("/reset-password", status_code=status.HTTP_200_OK)
def reset_password(
    verify_data: ForgotPasswordVerify, db: Session = Depends(get_session)
):

    otp_record = db.exec(
        select(OTPVerification)
        .where(OTPVerification.email == verify_data.iitk_email)
        .where(OTPVerification.purpose == "reset")
    ).first()

    if not otp_record:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No password reset request found.",
        )

    if otp_record.otp_code != verify_data.otp_code:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid verification code."
        )

    if otp_record.expires_at < now():
        db.delete(otp_record)
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Verification code has expired. Please request a new one.",
        )

    db_user = get_user_by_email(session=db, email=verify_data.iitk_email)
    if not db_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="User not found."
        )

    db_user.hashed_password = get_password_hash(verify_data.new_password)
    db.add(db_user)
    db.commit()

    db.delete(otp_record)
    db.commit()

    return {"message": "Password has been reset successfully. You can now log in."}
