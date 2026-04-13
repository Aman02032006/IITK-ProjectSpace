from fastapi_mail import FastMail, MessageSchema, ConnectionConfig, MessageType
from pydantic import EmailStr
from core.config import settings

conf = ConnectionConfig(
    MAIL_USERNAME=settings.MAIL_USERNAME,
    MAIL_PASSWORD=settings.MAIL_PASSWORD,
    MAIL_FROM=settings.MAIL_FROM,
    MAIL_PORT=settings.MAIL_PORT,
    MAIL_SERVER=settings.MAIL_SERVER,
    MAIL_STARTTLS=settings.MAIL_STARTTLS,
    MAIL_SSL_TLS=settings.MAIL_SSL_TLS,
    USE_CREDENTIALS=True,
    VALIDATE_CERTS=True,
)


async def send_otp_email(
    email_to: EmailStr, otp_code: str, name: str, purpose: str = "register"
):
    if purpose == "reset":
        subject = "IITK ProjectSpace OTP Verification"
        title = "Password Reset Request"
        message_text = "We received a request to reset your password. Please use the verification code below to proceed:"
    elif purpose == "secondary_email":
        subject = "IITK ProjectSpace OTP Verification"
        title = "Secondary Email Verification"
        message_text = "We received a request to link this email as an alternative login for your IITK ProjectSpace account. Please use the verification code below to proceed:"
    else:
        subject = "IITK ProjectSpace OTP Verification"
        title = "Welcome to IITK ProjectSpace"
        message_text = "Thank you for registering. Please use the verification code below to proceed with password creation:"

    # 2. The Dynamic HTML Template
    html_content = f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333; border: 1px solid #eee; border-radius: 10px;">
        <h2 style="color: #001d39; text-align: center;">{title}</h2>
        <p>Hello {name},</p>
        <p>{message_text}</p>
        
        <div style="background-color: #f1f2f5; padding: 20px; text-align: center; border-radius: 10px; margin: 30px 0;">
            <h1 style="letter-spacing: 8px; color: #001d39; margin: 0; font-size: 36px;">{otp_code}</h1>
        </div>
        
        <p style="text-align: center; color: #666; font-size: 14px;">This code will expire in 10 minutes.</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
        <p style="font-size: 12px; color: #999; text-align: center;">If this was not you, please ignore this email.</p>
    </div>
    """

    message = MessageSchema(
        subject=subject,
        recipients=[email_to],
        body=html_content,
        subtype=MessageType.html,
    )

    fm = FastMail(conf)
    await fm.send_message(message)
