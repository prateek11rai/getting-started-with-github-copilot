import copy

import pytest
from fastapi.testclient import TestClient

from src.app import activities, app

client = TestClient(app)
ORIGINAL_ACTIVITIES = copy.deepcopy(activities)


@pytest.fixture(autouse=True)
def reset_activities():
    """Restore the in-memory database so every test starts from the same data"""
    activities.clear()
    activities.update(copy.deepcopy(ORIGINAL_ACTIVITIES))


def test_root_redirects_to_static_index():
    # Arrange
    url = "/"

    # Act
    response = client.get(url, follow_redirects=False)

    # Assert
    assert response.status_code == 307
    assert response.headers["location"] == "/static/index.html"


def test_get_activities_returns_every_activity_with_its_fields():
    # Arrange
    expected_fields = {"description", "schedule", "max_participants", "participants"}

    # Act
    response = client.get("/activities")

    # Assert
    assert response.status_code == 200
    data = response.json()
    assert set(data) == set(ORIGINAL_ACTIVITIES)
    for details in data.values():
        assert set(details) == expected_fields


def test_signup_adds_participant():
    # Arrange
    email = "newstudent@mergington.edu"

    # Act
    response = client.post("/activities/Chess Club/signup", params={"email": email})

    # Assert
    assert response.status_code == 200
    assert response.json() == {"message": f"Signed up {email} for Chess Club"}
    assert email in activities["Chess Club"]["participants"]


def test_signup_rejects_duplicate_registration():
    # Arrange
    email = activities["Chess Club"]["participants"][0]

    # Act
    response = client.post("/activities/Chess Club/signup", params={"email": email})

    # Assert
    assert response.status_code == 400
    assert response.json() == {"detail": "Student is already signed up"}
    assert activities["Chess Club"]["participants"].count(email) == 1


def test_signup_for_unknown_activity_returns_404():
    # Arrange
    email = "newstudent@mergington.edu"

    # Act
    response = client.post("/activities/Underwater Basket Weaving/signup", params={"email": email})

    # Assert
    assert response.status_code == 404
    assert response.json() == {"detail": "Activity not found"}


def test_unregister_removes_participant():
    # Arrange
    email = activities["Chess Club"]["participants"][0]

    # Act
    response = client.delete("/activities/Chess Club/unregister", params={"email": email})

    # Assert
    assert response.status_code == 200
    assert response.json() == {"message": f"Unregistered {email} from Chess Club"}
    assert email not in activities["Chess Club"]["participants"]


def test_unregister_student_not_signed_up_returns_404():
    # Arrange
    email = "not-registered@mergington.edu"

    # Act
    response = client.delete("/activities/Chess Club/unregister", params={"email": email})

    # Assert
    assert response.status_code == 404
    assert response.json() == {"detail": "Student is not signed up for this activity"}


def test_unregister_from_unknown_activity_returns_404():
    # Arrange
    email = "michael@mergington.edu"

    # Act
    response = client.delete("/activities/Underwater Basket Weaving/unregister", params={"email": email})

    # Assert
    assert response.status_code == 404
    assert response.json() == {"detail": "Activity not found"}


def test_signup_then_unregister_round_trip():
    # Arrange
    email = "roundtrip@mergington.edu"
    before = list(activities["Art Studio"]["participants"])

    # Act
    signup = client.post("/activities/Art Studio/signup", params={"email": email})
    unregister = client.delete("/activities/Art Studio/unregister", params={"email": email})

    # Assert
    assert signup.status_code == 200
    assert unregister.status_code == 200
    assert activities["Art Studio"]["participants"] == before
