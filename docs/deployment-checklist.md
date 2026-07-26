# Production deployment checklist

**Status: complete. Last production acceptance pass: 26 July 2026.**

Public resources:

- GitHub: <https://github.com/rit2001/route53-clone>
- Frontend: <https://route53-clone-three.vercel.app>
- Backend: <https://route53-clone-production-eb00.up.railway.app>
- Health:
  <https://route53-clone-production-eb00.up.railway.app/api/v1/health>
- API docs: <https://route53-clone-production-eb00.up.railway.app/docs>

No bearer token, provider credential, or private environment value is recorded
in this checklist.

## Repository and Railway

- [x] The public repository is connected to both deployment providers.
- [x] One Railway service uses `backend` as its root directory.
- [x] Railway Config File Path is `/backend/railway.json`.
- [x] A persistent Railway volume is attached and mounted at `/data`.
- [x] `DATABASE_URL` is `sqlite:////data/route53.db`.
- [x] The service can write to Railway's root-mounted volume.
- [x] All documented backend environment variables are configured.
- [x] Deployment logs show a successful Alembic upgrade.
- [x] Deployment logs show the demo user was created or already existed.
- [x] Exactly one Uvicorn worker starts.
- [x] `GET /api/v1/health` returns HTTP 200 and `environment: production`.
- [x] A demo-user login request returns HTTP 200.

Before any future production schema change, use Railway's current volume backup
and restore procedure and test rollback against a copy. Do not casually
downgrade the live initial migration or copy only the SQLite main file while WAL
data may be active.

## Vercel and cross-origin configuration

- [x] The Vercel project root directory is `frontend`.
- [x] `NEXT_PUBLIC_API_URL` is the Railway HTTPS URL ending in `/api/v1`.
- [x] The Vercel production deployment succeeds.
- [x] Railway `FRONTEND_ORIGIN` exactly matches
  `https://route53-clone-three.vercel.app`.
- [x] The backend was redeployed after the final CORS origin was set.
- [x] Browser requests have no mixed-content failure.
- [x] Login, refresh-based session restoration, and logout work.
- [x] Direct refreshes of protected nested frontend routes work.

## Persistence and acceptance

- [x] Hosted Zone create, read, update, and delete work in production.
- [x] DNS Record create, read, update, and delete work in production.
- [x] Public-zone generated NS and SOA record sets remain protected.
- [x] A Railway restart retained the demo user, active session, Hosted Zones, and
  DNS records.
- [x] Hosted Zone and DNS Record data remained readable and editable after restart.
- [x] The idempotent demo seed completed after restart without duplicating or
  resetting the user.
- [x] Health returned HTTP 200 after restart.
- [x] Public repository, application, backend, health, and API-doc links work.
- [x] Frontend nested-route navigation and refresh work.

The restart-persistence checks above were manually verified against the mounted
Railway `/data` volume, not inferred only from local Docker behaviour.
