from sqlmodel import select
from models.recruitment import Recruitment
from models.user import User


def test_search_recruitments_basic(auth_client, session):
    user = session.exec(select(User)).first()

    recruitment = Recruitment(
        title="Backend Developer",
        description="Python FastAPI role",
        creator_id=user.id,
        status="Open",
        domains=["Web"]
    )

    session.add(recruitment)
    session.commit()

    response = auth_client.get("/search/recruitments?q=Backend")

    assert response.status_code == 200
    data = response.json()

    assert data["total"] >= 1
    assert len(data["results"]) >= 1
    assert "Backend" in data["results"][0]["title"]


def test_search_recruitments_status_filter(auth_client, session):
    user = session.exec(select(User)).first()

    recruitment = Recruitment(
        title="ML Intern",
        description="AI role",
        creator_id=user.id,
        status="Closed",
        domains=["AI"]
    )

    session.add(recruitment)
    session.commit()

    response = auth_client.get("/search/recruitments?status=Closed")

    assert response.status_code == 200
    data = response.json()

    assert data["total"] >= 1
    assert data["results"][0]["status"] == "Closed"


def test_search_recruitments_no_results(auth_client):
    response = auth_client.get("/search/recruitments?q=nonexistent")

    assert response.status_code == 200
    data = response.json()

    assert data["total"] == 0
    assert data["results"] == []


def test_search_recruitments_pagination(auth_client, session):
    user = session.exec(select(User)).first()

    for i in range(5):
        recruitment = Recruitment(
            title=f"Recruitment {i}",
            description="Test",
            creator_id=user.id,
            status="Open"
        )
        session.add(recruitment)

    session.commit()

    response = auth_client.get("/search/recruitments?limit=2&offset=0")

    assert response.status_code == 200
    data = response.json()

    assert len(data["results"]) == 2


def test_search_recruitments_domain_filter(auth_client, session):
    user = session.exec(select(User)).first()

    recruitment = Recruitment(
        title="Frontend Intern",
        description="React role",
        creator_id=user.id,
        status="Open",
        domains=["Web"]
    )

    session.add(recruitment)
    session.commit()

    response = auth_client.get("/search/recruitments?domain=Web")

    assert response.status_code == 200
    data = response.json()

    assert data["total"] >= 1
    assert data["results"][0]["title"] == "Frontend Intern"

def test_search_recruitments_default_open(auth_client, session):
    from models.recruitment import Recruitment
    from models.user import User

    user = session.exec(select(User)).first()

    recruitment = Recruitment(
        title="Closed Role",
        description="Test",
        creator_id=user.id,
        status="Closed"
    )

    session.add(recruitment)
    session.commit()

    response = auth_client.get("/search/recruitments")

    assert response.status_code == 200
    data = response.json()

    # should not include closed recruitment
    assert data["total"] == 0