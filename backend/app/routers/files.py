import uuid

from fastapi import APIRouter, Depends, HTTPException, UploadFile, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.deps import get_current_user
from app.models import FileRecord, User
from app.schemas import FileOut

router = APIRouter(prefix="/files", tags=["files"])


@router.get("", response_model=list[FileOut])
def list_files(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return (
        db.query(FileRecord)
        .filter(FileRecord.owner_id == current_user.id)
        .order_by(FileRecord.created_at.desc())
        .all()
    )


@router.post("", response_model=FileOut, status_code=status.HTTP_201_CREATED)
def upload_file(
    file: UploadFile,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if file.content_type not in settings.allowed_content_types:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, f"Unsupported file type: {file.content_type}")

    # Read the real bytes rather than trusting the client-sent Content-Length header.
    contents = file.file.read(settings.max_upload_size_bytes + 1)
    if len(contents) > settings.max_upload_size_bytes:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "File exceeds the 10 MB size limit")

    # The id is the on-disk filename - always server-generated, never derived from the
    # client-supplied filename, so there is no path-traversal surface to sanitize against.
    file_id = uuid.uuid4().hex
    (settings.storage_dir / file_id).write_bytes(contents)

    record = FileRecord(
        id=file_id,
        owner_id=current_user.id,
        original_filename=file.filename or "unnamed",
        content_type=file.content_type,
        size_bytes=len(contents),
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


@router.get("/{file_id}/download")
def download_file(
    file_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    record = (
        db.query(FileRecord)
        .filter(FileRecord.id == file_id, FileRecord.owner_id == current_user.id)
        .first()
    )
    # 404 (not 403) for files owned by someone else too, so existence isn't leaked.
    if record is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "File not found")

    file_path = settings.storage_dir / record.id
    if not file_path.exists():
        raise HTTPException(status.HTTP_404_NOT_FOUND, "File not found")

    return FileResponse(
        path=file_path,
        media_type=record.content_type,
        filename=record.original_filename,
    )
