# Route53 Clone

Route53 Clone is a time-boxed internship assignment that will provide an original,
Route53-inspired interface for managing mocked hosted zones and DNS record sets.
It is a learning application: it will not connect to AWS or publish real DNS.

## Current status

**Case 3 — authenticated Hosted Zone backend CRUD.**

Available now:

- Next.js App Router foundation with strict TypeScript, Tailwind CSS, and ESLint
- FastAPI application factory, versioned routing, CORS, and health endpoints
- SQLAlchemy session/engine foundation with SQLite foreign keys enabled
- Typed User, Session, HostedZone, and DNSRecord persistence models
- Deterministic constraints, indexes, enum checks, and database cascade deletes
- Alembic revision `67a8ad885a32` for the complete core schema
- Argon2 password hashing and persistent hashed opaque bearer sessions
- Login, logout, current-user, and reusable protected-route dependencies
- Idempotent, environment-configured demo-user seed command
- Authenticated Hosted Zone list, create, detail, comment update, and delete API
- Canonical domain validation, ownership isolation, and duplicate protection
- Hosted Zone search, public/private filtering, allowlisted sorting, and pagination
- Atomic mocked NS and SOA system-record generation for public zones
- Aggregate record counts without per-zone count queries
- Backend API, security, seed, persistence, cascade, and migration tests
- Local Dockerfiles and Docker Compose configuration
- Architecture, API, data-model, UI, and staged implementation contracts

General DNS Record CRUD remains planned for Case 4. Frontend authentication and
Hosted Zone management remain deferred to Cases 5 and 6.

## Planned features

- Persistent mocked users and sessions
- Public and private hosted-zone management
- Multi-value DNS record-set management for the required record types
- Route53-inspired operational tables, forms, search, filters, and pagination
- Confirmation dialogs, toasts, and complete loading/error/empty states
- Vercel frontend plus one-worker Railway backend deployment

See the [implementation plan](docs/implementation-plan.md) for case-by-case
acceptance criteria.

## Technology

| Area | Foundation |
| --- | --- |
| Frontend | Next.js, React, TypeScript, Tailwind CSS, ESLint, npm |
| Backend | Python, FastAPI, Pydantic Settings, pwdlib/Argon2, SQLAlchemy, Alembic |
| Testing | pytest, HTTPX ASGI transport |
| Database | SQLite |
| Deployment target | Vercel frontend, Railway backend and persistent volume |

TanStack Query, React Hook Form, and Zod are intentionally deferred until their
owning frontend cases.

## Repository layout

```text
frontend/   Next.js application and frontend Dockerfile
backend/    FastAPI application, Alembic, tests, and backend Dockerfile
docs/       Architecture and product contracts
.github/    Workflow location reserved for Case 10
```

The backend follows `API router -> service -> repository -> SQLAlchemy/database`.
Read the full [architecture](docs/architecture.md) before adding a feature.

## Local setup

Prerequisites:

- Node.js 20.9 or newer and npm
- Python 3.10 or newer locally; deployment targets Python 3.12
- Docker Desktop, optionally

Create local environment settings:

```bash
cp .env.example .env
```

Start the backend:

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements-dev.txt
alembic upgrade head
python -m app.seed
uvicorn app.main:app --reload
```

The API is available at `http://localhost:8000`, its docs at
`http://localhost:8000/docs`, and health at
`http://localhost:8000/api/v1/health`.

## Mocked demo authentication

The public development credentials are:

```text
Email: demo@route53.local
Password: Route53Demo123!
```

They are intentionally mocked credentials, not production secrets. Override the
`DEMO_USER_*` environment variables for a deployed demonstration, migrate the
database, and seed once:

```bash
cd backend
source .venv/bin/activate
alembic upgrade head
python -m app.seed
```

The seed command is idempotent and will not reset an existing user's password.

Log in:

```bash
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "demo@route53.local",
    "password": "Route53Demo123!"
  }'
```

Use the returned opaque token without committing it:

```bash
curl http://localhost:8000/api/v1/auth/me \
  -H "Authorization: Bearer REPLACE_WITH_TOKEN"
```

Create a public Hosted Zone:

```bash
curl -X POST http://localhost:8000/api/v1/hosted-zones \
  -H "Authorization: Bearer REPLACE_WITH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "example.com",
    "comment": "Demo public zone",
    "zone_type": "PUBLIC"
  }'
```

The name is stored as `example.com.`. Public zones receive locally generated,
persisted NS and SOA system records; they are mock data and do not publish or
delegate real DNS.

Search and filter the current user's zones:

```bash
curl "http://localhost:8000/api/v1/hosted-zones?search=example&zone_type=PUBLIC&page=1&page_size=10&sort_by=name&sort_order=asc" \
  -H "Authorization: Bearer REPLACE_WITH_TOKEN"
```

In another shell, start the frontend:

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:3000`.

## Commands

Frontend quality checks:

```bash
cd frontend
npm run lint
npm run typecheck
npm run build
```

Backend quality checks:

```bash
cd backend
source .venv/bin/activate
pytest
python -c "from app.main import app; print(app.title)"
alembic current
alembic check
```

Production-like local containers:

```bash
docker compose config
docker compose up --build
```

Compose uses a local named volume mounted at `/app/data`. Railway will eventually
use its own persistent volume at `/data`; production must run exactly one Uvicorn
worker.

## API foundation

Implemented:

- `GET /`
- `GET /api/v1/health`
- `POST /api/v1/auth/login`
- `POST /api/v1/auth/logout`
- `GET /api/v1/auth/me`
- `GET /api/v1/hosted-zones`
- `POST /api/v1/hosted-zones`
- `GET /api/v1/hosted-zones/{zone_id}`
- `PATCH /api/v1/hosted-zones/{zone_id}`
- `DELETE /api/v1/hosted-zones/{zone_id}`

The implemented and planned API is documented in the
[API contract](docs/api-contract.md).

## Current limitations

- General DNS Record CRUD is not implemented; only automatic public-zone NS and
  SOA system records exist.
- The frontend has no authentication flow and remains a development notice.
- Hosted Zone management currently requires direct API use.
- CI and live Vercel/Railway configuration are deferred to Case 10.

## Licence

[MIT](LICENSE)
