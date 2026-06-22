import io

from app.config import settings
from tests.conftest import auth_headers, register_and_login


def test_upload_and_list_file(client):
    token = register_and_login(client, "uploader@example.com")
    headers = auth_headers(token)

    upload = client.post(
        "/files",
        headers=headers,
        files={"file": ("notes.txt", io.BytesIO(b"hello world"), "text/plain")},
    )
    assert upload.status_code == 201
    body = upload.json()
    assert body["original_filename"] == "notes.txt"
    assert body["size_bytes"] == len(b"hello world")

    listing = client.get("/files", headers=headers)
    assert listing.status_code == 200
    files = listing.json()
    assert len(files) == 1
    assert files[0]["id"] == body["id"]


def test_download_owned_file(client):
    token = register_and_login(client, "downloader@example.com")
    headers = auth_headers(token)

    upload = client.post(
        "/files",
        headers=headers,
        files={"file": ("report.txt", io.BytesIO(b"file contents"), "text/plain")},
    )
    file_id = upload.json()["id"]

    download = client.get(f"/files/{file_id}/download", headers=headers)
    assert download.status_code == 200
    assert download.content == b"file contents"
    assert "report.txt" in download.headers["content-disposition"]


def test_cannot_download_other_users_file(client):
    token_a = register_and_login(client, "owner@example.com")
    token_b = register_and_login(client, "intruder@example.com")

    upload = client.post(
        "/files",
        headers=auth_headers(token_a),
        files={"file": ("secret.txt", io.BytesIO(b"top secret"), "text/plain")},
    )
    file_id = upload.json()["id"]

    download = client.get(f"/files/{file_id}/download", headers=auth_headers(token_b))
    assert download.status_code == 404


def test_unlisted_users_files_not_visible(client):
    token_a = register_and_login(client, "ownerb@example.com")
    token_b = register_and_login(client, "otherb@example.com")

    client.post(
        "/files",
        headers=auth_headers(token_a),
        files={"file": ("a.txt", io.BytesIO(b"a"), "text/plain")},
    )

    listing = client.get("/files", headers=auth_headers(token_b))
    assert listing.json() == []


def test_disallowed_content_type_rejected(client):
    token = register_and_login(client, "typecheck@example.com")
    resp = client.post(
        "/files",
        headers=auth_headers(token),
        files={"file": ("virus.exe", io.BytesIO(b"binary"), "application/x-msdownload")},
    )
    assert resp.status_code == 400


def test_oversized_file_rejected(client, monkeypatch):
    monkeypatch.setattr(settings, "max_upload_size_bytes", 10)
    token = register_and_login(client, "sizecheck@example.com")
    resp = client.post(
        "/files",
        headers=auth_headers(token),
        files={"file": ("big.txt", io.BytesIO(b"x" * 11), "text/plain")},
    )
    assert resp.status_code == 400
