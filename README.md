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

## Decisions & tradeoffs

**Auth: stateless JWT in localStorage, 30-minute expiry, no refresh token.**
This is simpler to build and reason about than HttpOnly cookies + CSRF protection + a
refresh-token rotation flow, but it means a token stolen via XSS is usable until it
expires. The short expiry bounds that window; it's the tradeoff I'd revisit first for a
real product (HttpOnly, Secure, SameSite cookies + refresh tokens).

**Logout is a no-op server-side.** JWTs aren't blacklisted, so `/auth/logout` just requires
a valid token and returns 200 — the actual "logout" is the client discarding the token.
Consistent with the stateless-JWT tradeoff above.

**Filenames are never trusted as paths.** Every uploaded file's on-disk name is a
server-generated UUID (which also doubles as the file's DB primary key and the URL path
segment). The user's original filename is stored only as DB metadata, used solely to set
the `Content-Disposition` header on download. This sidesteps path-traversal as a class of
bug rather than trying to sanitize a hostile filename.

**Size and content-type limits are enforced against real bytes, not headers.** The upload
route reads the actual file content and checks its length and the multipart-reported
content type against an allowlist, rather than trusting the client-sent `Content-Length`/
`Content-Type` headers, which are easy to spoof. Frontend-side checks exist only to give
users fast feedback before the (slower) network round-trip; they aren't a security
boundary.

**Ownership is enforced at the query level.** Listing and downloading both filter by
`WHERE owner_id = current_user.id` in the query itself, rather than fetching a row and then
checking ownership in Python — harder to accidentally regress. Downloading a file that
doesn't exist and downloading a file owned by someone else both return `404`, not `403`,
so a non-owner can't use the status code to confirm a file exists.

**SQLite now, Postgres-ready later.** All DB access goes through SQLAlchemy against one
`DATABASE_URL` setting. Moving to Postgres is changing that URL (and adding a driver
package) — no code references SQLite-specific behavior except a `connect_args` branch that
only applies when the URL is `sqlite:`.

**Password hashing uses `bcrypt` directly**, not `passlib`, to avoid passlib's
long-unmaintained bcrypt-backend version pinning. bcrypt also ignores anything past 72
bytes of input, so the registration schema caps password length at 72 characters rather
than silently hashing a truncated password.

**File storage is local disk + DB metadata**, not S3 — appropriate for a single-instance
assessment app. The moment this needs to run on more than one instance, storage would need
to move to something like S3.

**Frontend Docker container runs Vite's dev server**, not a production build behind nginx.
Faster to wire up for this scope; the first thing I'd change before deploying anywhere
real.

## What I'd improve with more time

- HttpOnly cookie + refresh-token auth instead of a long-lived bearer token in localStorage
- Password reset flow
- S3 (or similar) for file storage instead of local disk, with virus/malware scanning on upload
- Pagination on the file list
- Component-level frontend tests (React Testing Library) — current frontend tests only cover the API client, not rendered components
- Responsive file list on narrow screens (table currently has no mobile breakpoint)
- Rate limiting on `/auth/login` and `/auth/register`
