from tests.conftest import auth_headers, register_and_login


def test_register_success(client):
    resp = client.post("/auth/register", json={"email": "alice@example.com", "password": "password123"})
    assert resp.status_code == 201
    body = resp.json()
    assert body["email"] == "alice@example.com"
    assert "password" not in body
    assert "hashed_password" not in body


def test_register_duplicate_email_rejected(client):
    client.post("/auth/register", json={"email": "bob@example.com", "password": "password123"})
    resp = client.post("/auth/register", json={"email": "bob@example.com", "password": "password123"})
    assert resp.status_code == 400


def test_register_short_password_rejected(client):
    resp = client.post("/auth/register", json={"email": "carol@example.com", "password": "short"})
    assert resp.status_code == 422


def test_login_success(client):
    client.post("/auth/register", json={"email": "dave@example.com", "password": "password123"})
    resp = client.post("/auth/login", json={"email": "dave@example.com", "password": "password123"})
    assert resp.status_code == 200
    assert resp.json()["token_type"] == "bearer"
    assert resp.json()["access_token"]


def test_login_wrong_password_rejected(client):
    client.post("/auth/register", json={"email": "erin@example.com", "password": "password123"})
    resp = client.post("/auth/login", json={"email": "erin@example.com", "password": "wrong-password"})
    assert resp.status_code == 401


def test_login_nonexistent_user_rejected(client):
    resp = client.post("/auth/login", json={"email": "ghost@example.com", "password": "password123"})
    assert resp.status_code == 401


def test_protected_route_requires_token(client):
    resp = client.get("/files")
    assert resp.status_code == 401


def test_logout_requires_token_then_succeeds(client):
    assert client.post("/auth/logout").status_code == 401

    token = register_and_login(client, "frank@example.com")
    resp = client.post("/auth/logout", headers=auth_headers(token))
    assert resp.status_code == 200
