# Production deployment checklist

Use this checklist after connecting the repository to Railway and Vercel. Do not
record bearer tokens or private environment values in the repository.

## Repository and Railway

- [ ] The repository is available to both deployment providers.
- [ ] One Railway service uses `backend` as its root directory.
- [ ] Railway Config File Path is `/backend/railway.json`.
- [ ] A persistent Railway volume is attached and mounted at `/data`.
- [ ] A Railway volume backup policy is understood before schema changes.
- [ ] `DATABASE_URL` is exactly `sqlite:////data/route53.db`.
- [ ] `RAILWAY_RUN_UID=0` allows writes to Railway's root-mounted volume.
- [ ] All documented backend environment variables are configured.
- [ ] Deployment logs show a successful Alembic upgrade.
- [ ] Deployment logs show the demo user was created or already existed.
- [ ] Only one Uvicorn worker starts.
- [ ] `GET /api/v1/health` returns HTTP 200 and production environment data.
- [ ] A demo-user login request returns HTTP 200.

## Vercel and cross-origin configuration

- [ ] The Vercel project root directory is `frontend`.
- [ ] `NEXT_PUBLIC_API_URL` is the HTTPS Railway URL ending in `/api/v1`.
- [ ] The Vercel production deployment succeeds.
- [ ] Railway `FRONTEND_ORIGIN` exactly matches the final Vercel origin.
- [ ] The backend is redeployed after its CORS origin changes.
- [ ] The browser reports no mixed-content or material console errors.
- [ ] Login, refresh-based session restoration, and logout work.

## Persistence and acceptance

- [ ] Hosted Zone create, read, update, and delete work in production.
- [ ] DNS Record create, read, update, and delete work in production.
- [ ] Public-zone generated NS and SOA record sets remain protected.
- [ ] A Railway backend restart retains users, zones, records, and sessions.
- [ ] Health still returns HTTP 200 after restart.
- [ ] Every public application link and nested-route refresh works.
