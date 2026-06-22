import os
import tempfile
from pathlib import Path

import pytest

# Settings is a module-level singleton read from the environment at import time, so these
# must be set before anything imports app.config - that's why this happens here, at the top
# of conftest, ahead of the `from app...` imports below.
_TEST_DIR = Path(tempfile.mkdtemp(prefix="jr-assessment-test-"))
os.environ["DATABASE_URL"] = f"sqlite:///{_TEST_DIR / 'test.db'}"
os.environ["STORAGE_DIR"] = str(_TEST_DIR / "storage")
os.environ["JWT_SECRET_KEY"] = "test-secret"

from fastapi.testclient import TestClient  # noqa: E402

from app.database import SessionLocal  # noqa: E402
from app.main import app  # noqa: E402
from app.models import FileRecord, User  # noqa: E402


@pytest.fixture()
def client():
    return TestClient(app)


@pytest.fixture(autouse=True)
def _clean_state():
    yield
    db = SessionLocal()
    try:
        db.query(FileRecord).delete()
        db.query(User).delete()
        db.commit()
    finally:
        db.close()
    for f in Path(os.environ["STORAGE_DIR"]).glob("*"):
        f.unlink()


def register_and_login(client: TestClient, email: str, password: str = "password123") -> str:
    client.post("/auth/register", json={"email": email, "password": password})
    resp = client.post("/auth/login", json={"email": email, "password": password})
    return resp.json()["access_token"]


def auth_headers(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}
