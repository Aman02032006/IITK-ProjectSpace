from unittest.mock import patch
from sqlmodel import select
from models.user import User
from models.project import Project, ProjectPendingLink, ProjectTeamLink

def test_create_project_with_invites_complete(auth_client, session):
    # Create a friend to invite
    friend = User(
        fullname="Alan Turing",
        iitk_email="alan@iitk.ac.in",
        secondary_email=None,
        hashed_password="fake_password",
        is_active=True
    )
    session.add(friend)
    session.commit()
    session.refresh(friend) 

    project_data = {
        "title": "Enigma Machine Simulator",
        "summary": "Breaking codes.",
        "description": "Top secret project.",
        "team_member_ids": [str(friend.id)]
    }

    with patch("routers.projects.create_notification") as mock_notify:
        response = auth_client.post("/projects/", json=project_data)

    # API Response Assertions
    assert response.status_code == 201
    data = response.json()
    
    assert data["title"] == "Enigma Machine Simulator"
    assert data["creator_name"] == "Test User"
    assert data["creator_id"] is not None

    # Database State Assertions
    pending_invite = session.exec(
        select(ProjectPendingLink).where(ProjectPendingLink.user_id == friend.id)
    ).first()
    
    assert pending_invite is not None
    assert str(pending_invite.project_id) == data["id"]

    # Notification System Assertions
    mock_notify.assert_called_once()
    
    _, kwargs = mock_notify.call_args
    assert kwargs["recipient_id"] == friend.id
    assert kwargs["title"] == "Project Team Invitation"
    assert "invited you to join" in kwargs["message"]

def test_update_existing_project(auth_client, session):
    test_user = session.exec(select(User).where(User.iitk_email == "test@iitk.ac.in")).first()
    
    test_project = Project(
        title="Original Title",
        summary="Original summary",
        description="Original description",
        creator_id=test_user.id
    )
    session.add(test_project)
    session.commit()
    session.refresh(test_project)

    # Link Test User to the project
    session.add(ProjectTeamLink(project_id=test_project.id, user_id=test_user.id))
    session.commit()

    update_payload = {"title": "Updated Title via PATCH"}

    response = auth_client.patch(f"/projects/{test_project.id}", json=update_payload)

    assert response.status_code == 200
    assert response.json()["title"] == "Updated Title via PATCH"

def test_update_project_forbidden_for_non_members(auth_client, session):
    alan = User(fullname="Alan", iitk_email="alan2@iitk.ac.in", hashed_password="x", is_active=True,
                secondary_email=None)
    session.add(alan)
    session.commit()
    session.refresh(alan)

    alans_project = Project(
        title="Alan's Secret Project",
        summary="Top Secret",
        description="Keep out.",
        creator_id=alan.id
    )
    session.add(alans_project)
    session.commit()
    session.refresh(alans_project)
    
    session.add(ProjectTeamLink(project_id=alans_project.id, user_id=alan.id))
    session.commit()

    update_payload = {"title": "Test User Trying to Hack Alan's Project"}

    response = auth_client.patch(f"/projects/{alans_project.id}", json=update_payload)

    assert response.status_code == 403
    assert response.json()["detail"] == "Only team members can edit this project."