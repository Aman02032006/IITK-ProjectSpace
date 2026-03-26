import io
from datetime import datetime, timedelta
from unittest.mock import patch
from sqlmodel import select
from models.otp import OTPVerification
from models.user import User

def test_request_otp_success(client, session):
    request_data = {
        "fullname": "Test User",
        "iitk_email": "test@iitk.ac.in" 
    }

    with patch("routers.auth.send_otp_email") as mock_send_email:
        response = client.post("/auth/request-otp", json=request_data)

    assert response.status_code == 201
    assert response.json() == {"message": "Verification code sent successfully."}

    db_otp = session.exec(
        select(OTPVerification).where(OTPVerification.email == "test@iitk.ac.in")
    ).first()
    
    assert db_otp is not None
    assert db_otp.full_name == "Test User"
    assert db_otp.purpose == "register"
    assert len(db_otp.otp_code) == 6
    mock_send_email.assert_called_once()

def test_verify_otp_success(client, session):
    fake_otp = OTPVerification(
        email="test@iitk.ac.in",
        full_name="Test User",
        otp_code="123456",
        purpose="register",
        expires_at=datetime.utcnow() + timedelta(minutes=10)
    )
    session.add(fake_otp)
    session.commit()

    verify_data = {
        "iitk_email": "test@iitk.ac.in",
        "otp_code": "123456",
        "password": "SecretPass123"
    }

    response = client.post("/auth/verify-otp", json=verify_data)

    assert response.status_code == 201 
    assert response.json() == {"message": "Account created successfully!"}

    db_user = session.exec(select(User).where(User.iitk_email == "test@iitk.ac.in")).first()
    assert db_user is not None
    assert db_user.fullname == "Test User"
    assert db_user.is_active == True

    db_otp = session.exec(select(OTPVerification).where(OTPVerification.email == "test@iitk.ac.in")).first()
    assert db_otp is None 

def test_get_my_profile(auth_client):
    response = auth_client.get("/users/me")

    assert response.status_code == 200
    data = response.json()
    assert data["fullname"] == "Test User"
    assert data["iitk_email"] == "test@iitk.ac.in"
    assert "id" in data

def test_upload_profile_picture(auth_client):
    fake_image_content = b"fake image byte data"
    fake_file = io.BytesIO(fake_image_content)
    
    upload_files = {
        "file": ("test_avatar.jpg", fake_file, "image/jpeg")
    }

    response = auth_client.post("/users/me/profile-picture", files=upload_files)

    assert response.status_code == 200
    data = response.json()
    
    assert data["profile_picture_url"] is not None
    assert data["profile_picture_url"].startswith("/uploads/profilePictures/")
    assert data["profile_picture_url"].endswith(".jpg")


def test_edit_profile(auth_client, session):
    update_data = {
        "bio": "I love writing automated tests.",
        "github": "https://github.com/gracehopper",
        "skills": ["Python", "FastAPI", "Testing"]
    }

    response = auth_client.patch("/users/me", json=update_data)

    assert response.status_code == 200
    data = response.json()
    print(data) # debugging
    assert data["bio"] == "I love writing automated tests."
    assert data["github"] == "https://github.com/gracehopper"
    assert "Python" in data["skills"]

def test_search_users(auth_client, session):
    user1 = User(fullname="Alan Turing", iitk_email="alan@iitk.ac.in", hashed_password="x", is_active=True,
                 secondary_email=None)
    user2 = User(fullname="Ada Lovelace", iitk_email="ada@iitk.ac.in", hashed_password="x", is_active=True,
                 secondary_email=None)
    session.add_all([user1, user2])
    session.commit()

    response = auth_client.get("/users/search?q=Alan")

    assert response.status_code == 200
    results = response.json()
    
    assert len(results) == 1
    assert results[0]["fullname"] == "Alan Turing"

    # Test searching by email snippet
    response_email = auth_client.get("/users/search?q=ada@")
    assert response_email.status_code == 200
    assert response_email.json()[0]["fullname"] == "Ada Lovelace"