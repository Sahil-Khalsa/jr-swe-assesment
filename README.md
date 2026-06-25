# Jr. Software Engineer Assessment

A full-stack app where a user can register, log in, upload files, see a list of their own
files, and download them. Built for the SponsorUnited Jr. Software Engineer take-home.

**Stack:** FastAPI + SQLAlchemy (SQLite) on the backend, Vite + React + TypeScript on the
frontend, JWT auth, local filesystem file storage.

## Quick start (Docker)

```
docker compose up --build
```

- Frontend: http://localhost:5173
- Backend API: http://localhost:8000 (interactive docs at http://localhost:8000/docs)

Uploaded files and the SQLite database persist in a named volume (`backend_data`) across
container restarts.

## Quick start (without Docker)

**Backend**

```
cd backend
python -m venv .venv
.venv/Scripts/activate        # .venv/bin/activate on macOS/Linux
pip install -r requirements.txt
uvicorn app.main:app --reload
```

**Frontend** (in a second terminal)

```
cd frontend
npm install
npm run dev
```

Frontend expects the API at `http://localhost:8000` by default (see `frontend/.env`).

## Running tests

**Backend**

```
cd backend
pip install -r requirements.txt
pytest -v
```

14 tests cover registration/login/auth-required routes, and file upload/list/download
including ownership isolation, oversized-file rejection, and disallowed content types.

**Frontend**

```
cd frontend
npm install
npm test
```

7 Vitest tests cover the API client (`apiRequest`/`apiDownload`): success responses, error
messages surfaced from the backend's `detail` field, and the session-invalidation behavior
(a `401` on an authenticated request clears the session; a `401` on login, which carries no
token, does not). Kept to pure-function tests against a mocked `fetch` — no React Testing
Library/jsdom, since nothing here needs to render a component to be meaningfully tested.

## API

| Method | Path                     | Auth | Description                          |
|--------|--------------------------|------|---------------------------------------|
| POST   | `/auth/register`         | No   | Create an account                     |
| POST   | `/auth/login`             | No   | Returns a JWT access token            |
| POST   | `/auth/logout`             | Yes  | Client-side token discard (see below) |
| GET    | `/files`                  | Yes  | List the current user's files         |
| POST   | `/files`                  | Yes  | Upload a file                         |
| GET    | `/files/{id}/download`    | Yes  | Download a file you own               |

## Project structure

```
backend/app/        FastAPI app: routers, models, schemas, security, config
backend/tests/       pytest suite with isolated temp DB/storage per run
frontend/src/        React app: pages, components, auth context, API client
```

