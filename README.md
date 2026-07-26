# Route53 Clone

Route53 Clone is a time-boxed internship assignment that will provide an original,
Route53-inspired interface for managing mocked hosted zones and DNS record sets.
It is a learning application: it will not connect to AWS or publish real DNS.

## Current status

**Case 8 — Railway and Vercel production deployment readiness.**

Available now:

- Next.js App Router shell with strict TypeScript, Tailwind CSS, and ESLint
- Route 53-inspired dark utility header, service sidebar, breadcrumbs, dashboard,
  responsive mobile drawer, and honest placeholder sections
- Mock login, opaque-token session restoration, protected routing, and logout
- Typed native-fetch API client, standard backend-error parsing, and local session
  storage with expiry handling
- TanStack Query provider plus React Hook Form and Zod form infrastructure
- Real Hosted Zone list, debounced search, public/private filter, backend sorting,
  URL-driven pagination, refresh, and page-scoped selection
- Public/private Hosted Zone creation, detail summary, comment editing, typed
  delete confirmation, persisted name-server display, and copy actions
- Real DNS record-set table, URL-driven search/type/routing/alias filters,
  backend sorting, pagination, refresh, and user-record selection
- Type-aware creation for A, AAAA, CNAME, TXT, MX, NS, PTR, SRV, and CAA;
  values/TTL editing; deletion; copying; and protected system NS/SOA display
- Radix focus-managed dialogs and accessible Sonner notifications
- Vitest and React Testing Library coverage for API, authentication, login, route
  protection, storage, and navigation foundations
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
- Authenticated DNS record-set list, create, detail, values/TTL update, and delete
- Type-specific validation for A, AAAA, CNAME, TXT, MX, NS, PTR, SRV, and CAA
- Apex/relative record-name resolution, in-zone enforcement, and stable value
  deduplication
- CNAME coexistence rules and read-only protection for generated NS/SOA records
- Record search, type/routing/alias filters, allowlisted sorting, and pagination
- Backend API, security, seed, persistence, cascade, and migration tests
- Production backend entrypoint with automatic migration, idempotent seed, and
  exactly one Uvicorn worker
- Railway health/restart configuration and `/data` persistent-volume contract
- Vercel-safe production API URL validation and bounded CORS configuration
- Local production-like Dockerfiles and persistent Docker Compose configuration
- Architecture, API, data-model, UI, and staged implementation contracts

Hosted Zone and DNS Record P0 management workflows are now available end to end.

## Remaining planned work

- Visual and accessibility audit across completed workflows
- CI and live-deployment acceptance verification
- Final screenshots, documentation, and QA
- Manual connection of the repository to the Railway and Vercel accounts

See the [implementation plan](docs/implementation-plan.md) for case-by-case
acceptance criteria.

## Technology

| Area | Foundation |
| --- | --- |
| Frontend | Next.js, React, TypeScript, Tailwind CSS, TanStack Query, React Hook Form, Zod, Radix Dialog, Sonner, ESLint, npm |
| Backend | Python, FastAPI, Pydantic Settings, pwdlib/Argon2, SQLAlchemy, Alembic |
| Testing | pytest, HTTPX ASGI transport, Vitest, React Testing Library |
| Database | SQLite |
| Deployment target | Vercel frontend, Railway backend and persistent volume |

TanStack Query owns the frontend server-state foundation. React Hook Form and Zod
own form state and client validation. React Context is restricted to the mocked
authentication session.

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

The frontend reads `NEXT_PUBLIC_API_URL`, which must be an absolute HTTP(S) URL
ending in `/api/v1`. Local development defaults to
`http://localhost:8000/api/v1`. A deployed production origin rejects a missing,
localhost, or insecure API URL. Set the Railway HTTPS API URL as a public
environment variable in Vercel; never place secrets in `NEXT_PUBLIC_*`.

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

Create an A record set:

```bash
curl -X POST \
  http://localhost:8000/api/v1/hosted-zones/ZONE_ID/records \
  -H "Authorization: Bearer REPLACE_WITH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "api",
    "record_type": "A",
    "values": ["192.0.2.10"],
    "ttl": 300
  }'
```

Create an apex MX record set:

```bash
curl -X POST \
  http://localhost:8000/api/v1/hosted-zones/ZONE_ID/records \
  -H "Authorization: Bearer REPLACE_WITH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "@",
    "record_type": "MX",
    "values": [
      "10 mail1.example.com.",
      "20 mail2.example.com."
    ],
    "ttl": 300
  }'
```

List or search record sets:

```bash
curl "http://localhost:8000/api/v1/hosted-zones/ZONE_ID/records?search=api&record_type=A&page=1&page_size=25&sort_by=name&sort_order=asc" \
  -H "Authorization: Bearer REPLACE_WITH_TOKEN"
```

Supported user-created types are `A`, `AAAA`, `CNAME`, `TXT`, `MX`, `NS`,
`PTR`, `SRV`, and `CAA`. `SOA` is internal and generated public-zone NS/SOA
records are visible but protected from ordinary update and delete. Only simple
routing is supported, and alias creation is deliberately rejected.

In another shell, start the frontend:

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:3000/login` and use the public demo credentials. The root
route chooses login or dashboard after restoring the browser session.

Implemented frontend routes:

- `/login`
- `/route53/dashboard`
- `/route53/hosted-zones`
- `/route53/hosted-zones/new`
- `/route53/hosted-zones/{zoneId}`
- `/route53/hosted-zones/{zoneId}/records`
- `/route53/traffic-policies` (placeholder)
- `/route53/health-checks` (placeholder)
- `/route53/resolver` (placeholder)
- `/route53/profiles` (placeholder)

The opaque token and expiry are stored under `route53_clone_session`; passwords
are never persisted. This local-storage design is acceptable only for the public,
mocked assignment account. A security-sensitive production application would
reassess the browser threat model and session transport.

## Hosted Zone frontend workflow

After signing in, open `/route53/hosted-zones`. The operational table reads only
persisted API data. Search matches names and comments through the backend;
public/private filtering, allowlisted sorting, page, and page size live in URL
parameters so refresh and browser navigation retain the view.

Create accepts a domain, optional description, and public/private type. The
backend canonicalises the domain. A new public zone normally reports two system
record sets and four persisted mocked name servers; a private zone reports zero
records and no public name servers. Neither behavior publishes real DNS or
creates a VPC.

The detail page supports copying IDs/name servers, editing only the description,
deleting after typing the exact canonical zone name, and opening the nested
records workflow. Deletion also removes all record sets stored in the clone.

## DNS Record frontend workflow

Open a Hosted Zone and select **Manage records**, or navigate directly to
`/route53/hosted-zones/{zoneId}/records`. The page shows real persisted API data,
including generated NS and SOA system records for public zones. Search matches
record names and values; readable type, SIMPLE policy, alias status, page, page
size, and sorting are URL-backed.

Create record opens a type-aware editor for `A`, `AAAA`, `CNAME`, `TXT`, `MX`,
`NS`, `PTR`, `SRV`, and `CAA`. Enter one record-set value per line; empty lines
are removed and exact trimmed duplicates are preserved only once. The backend
canonicalises relative/apex names and performs authoritative type validation,
CNAME conflict checks, and ownership checks. SOA is internal, alias creation is
unsupported, and only SIMPLE routing is available.

User-managed records can update values and TTL or be removed through a
confirmation dialog. Generated NS/SOA records remain visible and copyable but
their selection, edit, and delete actions are disabled. Successful create/delete
operations refresh Hosted Zone aggregate counts. None of these operations
publishes or resolves real DNS.

## Commands

Frontend quality checks:

```bash
cd frontend
npm run lint
npm run typecheck
npm run test
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

The backend entrypoint migrates and idempotently seeds before starting. Compose
uses a named volume mounted at `/app/data`, so `docker compose restart backend`
retains local container data. Railway uses a separate persistent volume at
`/data`; it is never mounted locally.

## Production deployment

Railway and Vercel need each other's final public URL. Deploy the backend first
with a temporary planned Vercel origin, deploy Vercel with the resulting Railway
URL, then set Railway's CORS origin to the exact final Vercel origin and redeploy
the backend.

### Railway backend

1. Create a Railway project from this GitHub repository.
2. Create one service and set its **Root Directory** to `backend`. Railway then
   uses `backend/Dockerfile`.
3. In the service settings, set the Railway **Config File Path** to
   `/backend/railway.json`. Railway config-file discovery does not follow a
   monorepo Root Directory automatically.
4. Attach one persistent volume to that service and mount it at exactly `/data`.
5. Configure these service variables:

   ```text
   APP_ENV=production
   DATABASE_URL=sqlite:////data/route53.db
   FRONTEND_ORIGIN=https://YOUR-PROJECT.vercel.app
   SESSION_TTL_HOURS=168
   DEMO_USER_NAME=Route53 Demo User
   DEMO_USER_EMAIL=demo@route53.local
   DEMO_USER_PASSWORD=Route53Demo123!
   LOG_LEVEL=INFO
   RAILWAY_RUN_UID=0
   ```

   Railway provides `PORT`; do not override the image with a multi-worker start
   command. The checked-in entrypoint always uses one worker. Railway mounts
   volumes as root, so its documented `RAILWAY_RUN_UID=0` setting is required
   for write access; local and other container runs retain the image's non-root
   `app` user.
6. Confirm the health-check path is `/api/v1/health` and deploy.
7. Inspect logs in order: Alembic upgrades to head, the demo user is created or
   already exists, and Uvicorn starts on Railway's port.
8. Verify health:

   ```bash
   curl https://YOUR-RAILWAY-SERVICE.up.railway.app/api/v1/health
   ```

9. Verify the public mocked login without saving the returned token:

   ```bash
   curl -X POST \
     https://YOUR-RAILWAY-SERVICE.up.railway.app/api/v1/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email":"demo@route53.local","password":"Route53Demo123!"}'
   ```

The entrypoint uses fail-fast shell semantics: a failed migration or seed stops
the deployment before the API starts. Seeding is safe on every restart and never
resets an existing user's password. Before a schema rollback, create a Railway
volume backup and deploy the matching older application image. Do not copy only
the live `route53.db` file while the service is running because SQLite WAL data
may not yet be checkpointed. Do not run `alembic downgrade` against production
casually; the initial schema downgrade removes business tables.

### Vercel frontend

1. Import the same GitHub repository into Vercel.
2. Set the Vercel **Root Directory** to `frontend`; no `vercel.json` is needed.
3. Add this Production environment variable:

   ```text
   NEXT_PUBLIC_API_URL=https://YOUR-RAILWAY-SERVICE.up.railway.app/api/v1
   ```

4. Deploy and copy the final origin, for example
   `https://YOUR-PROJECT.vercel.app`.
5. Set Railway `FRONTEND_ORIGIN` to that exact origin with no path or trailing
   slash, then redeploy the backend.
6. Verify login, refresh-based session restoration, Hosted Zone CRUD, DNS Record
   CRUD, and direct refreshes of nested frontend routes.
7. Restart the Railway service and confirm the same zones and records remain.

Preview Vercel origins are not wildcarded. To test a preview against the backend,
deliberately set Railway `FRONTEND_ORIGIN` to that one exact preview origin, then
restore the production origin. The backend never enables unrestricted CORS.

Use the [production deployment checklist](docs/deployment-checklist.md) for the
final provider-side acceptance pass.

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
- `GET /api/v1/hosted-zones/{zone_id}/records`
- `POST /api/v1/hosted-zones/{zone_id}/records`
- `GET /api/v1/hosted-zones/{zone_id}/records/{record_id}`
- `PATCH /api/v1/hosted-zones/{zone_id}/records/{record_id}`
- `DELETE /api/v1/hosted-zones/{zone_id}/records/{record_id}`

The implemented and planned API is documented in the
[API contract](docs/api-contract.md).

## Current limitations

- Hosted Zone and DNS Record P0 management are complete in the frontend.
- Traffic policies, health checks, resolver, and profiles are explicit,
  non-functional placeholders.
- The application stores mocked control-plane data and does not publish or
  resolve real DNS.
- Alias targets and non-simple routing policies are outside the assignment.
- Visual/accessibility audit, CI, and the manual live Vercel/Railway deployment
  remain.

## Licence

[MIT](LICENSE)
