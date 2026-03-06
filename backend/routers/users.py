from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select

from core.database import engine
from models.user import User
from schemas.user import UserPublic
from core.security import get_current_user

router = APIRouter(prefix="/users", tags=["Users"])

@router.get("/me")
def get_my_profile(
    current_user: User = Depends(get_current_user),
):
    return {
        "name":        current_user.fullname,
        "email":       current_user.iitk_email,
        "role":        current_user.designation.value if current_user.designation else "",
        "department":  current_user.department.value  if current_user.department  else "",
        "institution": "Indian Institute of Technology Kanpur",
        "bio":         current_user.bio,
        "skills":      current_user.skills   or [],
        "domains":     current_user.domains  or [],
        "socialLinks": {
            "linkedin":   current_user.linkedin,
            "github":     current_user.github,
            "other_link1": current_user.other_link1,
            "other_link2": current_user.other_link2,
        },
        "profilePictureUrl": current_user.profile_picture_url,
        "cards": [],   # wire the Cards model when made
    }