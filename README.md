# Route53 Clone

Route53 Clone is a time-boxed internship assignment that will provide an original,
Route53-inspired interface for managing mocked hosted zones and DNS record sets.
It is a learning application: it will not connect to AWS or publish real DNS.

## Current status

**Case 1 — database models, migrations, and persistent SQLite behaviour.**

Available now:

- Next.js App Router foundation with strict TypeScript, Tailwind CSS, and ESLint
- FastAPI application factory, versioned routing, CORS, and health endpoints
- SQLAlchemy session/engine foundation with SQLite foreign keys enabled
- Typed User, Session, HostedZone, and DNSRecord persistence models
- Deterministic constraints, indexes, enum checks, and database cascade deletes
- Alembic revision `67a8ad885a32` for the complete core schema
- Backend endpoint, persistence, constraint, cascade, and migration tests
- Local Dockerfiles and Docker Compose configuration
- Architecture, API, data-model, UI, and staged implementation contracts

Hosted zone CRUD, record CRUD, authentication behaviour, repositories, and
services are planned but are not implemented yet.

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
| Backend | Python, FastAPI, Pydantic Settings, SQLAlchemy 2.x, Alembic |
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
uvicorn app.main:app --reload
```

The API is available at `http://localhost:8000`, its docs at
`http://localhost:8000/docs`, and health at
`http://localhost:8000/api/v1/health`.

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

The planned but unimplemented API is documented in the
[API contract](docs/api-contract.md).

## Current limitations

- Authentication workflows and session lifecycle logic are not implemented.
- Hosted zones and DNS records cannot yet be created or managed.
- No demo users or data are seeded.
- The frontend is a minimal development notice, not the final console.
- CI and live Vercel/Railway configuration are deferred to Case 10.

## Licence

[MIT](LICENSE)
