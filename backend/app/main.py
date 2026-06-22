from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database import Base, engine
from app.routers import auth, files

# No migration tool for an app this size - create_all is enough to stand up the schema.
Base.metadata.create_all(bind=engine)

app = FastAPI(title="Jr. Software Engineer Assessment API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(files.router)


@app.get("/health")
def health():
    return {"status": "ok"}
