# Implementation plan

Case 0 establishes repository structure, contracts, runtime configuration,
health endpoints, database plumbing, a minimal frontend, containers, tests, and
documentation. It deliberately contains no business entities, authentication, or
CRUD workflow.

P0 cases must be completed and stable before optional work. Case 5 added TanStack
Query for server-state infrastructure and React Hook Form plus Zod for forms.
Later workflow cases will use those foundations for domain data and may add a
lightweight accessible toast implementation when mutations need it. Redux and
Zustand remain outside the architecture.

## Case 1: Database models, migrations and persistence

Success criteria:

- Implement typed SQLAlchemy models for User, Session, HostedZone, and DNSRecord
  exactly within the documented ownership boundaries.
- Add the first Alembic migration with foreign keys, constraints, and indexes.
- Store record-set values together and verify SQLite foreign-key/cascade behaviour.
- Add isolated model and repository persistence tests using temporary databases.
- Confirm upgrade from an empty database and downgrade behaviour.

## Case 2: Mock authentication and persistent sessions

**Status: complete.**

Success criteria:

- Seed or safely bootstrap documented mock users without committing secrets.
- Implement login, logout, and current-user endpoints through router, service, and
  repository layers.
- Store only hashed opaque session tokens, enforce expiry, and authenticate with
  the bearer token returned once by login.
- Add authentication dependencies and tests for valid, invalid, expired, revoked,
  and persisted sessions.
- Keep authentication explicitly local; do not add AWS or external identity.

## Case 3: Hosted Zone backend CRUD and tests

**Status: complete.**

Success criteria:

- Implement all documented hosted-zone endpoints and Pydantic schemas.
- Enforce normalisation, validation, ownership, uniqueness, and immutable fields
  in services.
- Create public-zone NS/SOA system records transactionally.
- Keep routers thin and repositories query-focused.
- Cover happy paths, pagination, conflicts, ownership isolation, and cascades.

## Case 4: DNS Record backend CRUD, validation and tests

**Status: complete.**

Success criteria:

- Implement all documented record-set endpoints for every required record type.
- Validate names, TTL, values, zone containment, record-set uniqueness, CNAME
  conflicts, and type-specific syntax.
- Protect generated NS/SOA system records.
- Keep multi-value record sets atomic and consistently normalised.
- Cover valid/invalid examples, ownership isolation, filters, conflicts, and
  delete behaviour.

## Case 5: AWS-style application shell and frontend authentication

**Status: complete.**

Success criteria:

- Build the original dark header, light sidebar, page frame, breadcrumbs, and
  responsive navigation according to the UI specification.
- Add mocked login/session restoration/logout against the backend.
- Restrict React Context to authentication state.
- Provide accessible loading and failure behaviour without fake production data.
- Add focused component tests where the chosen test tooling provides value.

## Case 6: Hosted Zones frontend workflow

**Status: complete.**

Success criteria:

- Use TanStack Query to implement hosted-zone list, create, detail, edit-comment,
  and delete workflows.
- Use React Hook Form and Zod with backend-error mapping.
- Provide empty, loading, refreshing, error, success, and confirmation states.
- Invalidate or update caches intentionally after mutations.
- Match the API contract and dense operational visual direction.

## Case 7: DNS Records frontend workflow

**Status: complete.**

Success criteria:

- Implement record list, create, detail/edit, and delete workflows.
- Provide type-aware controls and guidance for every required record type.
- Support multiple values as one record set and protect system records in the UI.
- Preserve backend validation as authoritative and render its errors clearly.
- Verify keyboard and screen-reader operation for dynamic value controls.

## Case 8: Production deployment readiness

**Status: complete.**

Success criteria:

- Start Railway through a fail-fast migrate, idempotent seed, and one-worker
  Uvicorn sequence.
- Persist production SQLite data on a Railway volume mounted at `/data`.
- Restrict CORS to one configured frontend origin and validate the Vercel API URL.
- Keep local Compose startup and its persistent development volume functional.
- Document exact Railway/Vercel configuration and deployment acceptance checks.

Search, filtering, sorting, pagination, and page-scoped selection were delivered
within Cases 6 and 7. Bulk product operations remain deliberately out of scope.

## Case 9: Visual-polish and accessibility pass

Success criteria:

- Audit spacing, compact typography, borders, actions, responsive layouts, and
  Route53-inspired hierarchy across all workflows.
- Meet meaningful keyboard, focus, label, semantic table, dialog, and live-region
  requirements.
- Check contrast and reduced-motion expectations.
- Remove placeholder UI that distracts from P0; retain only honest labels.
- Validate loading, error, empty, overflow, and long-DNS-value edge cases.

## Case 10: CI and live-deployment verification

Success criteria:

- Add CI for backend tests plus frontend lint, type checking, and builds.
- Connect the repository to the prepared Vercel and Railway services.
- Execute the production checklist against the assigned public URLs.
- Verify deployed health, CORS, restart persistence, and browser workflows.
- Record rollback and operational outcomes without adding product scope.

The container, persistent-volume, one-worker startup, environment validation, and
deployment documentation were completed early in Case 8 because production
readiness became the immediate priority.

## Case 11: README, screenshots and final QA

Success criteria:

- Update README claims to match the finished application exactly.
- Add original screenshots of core workflows and final setup/deployment guidance.
- Run a clean-clone setup, migration, complete test/lint/build suite, and manual
  P0 acceptance checklist.
- Audit API docs, environment templates, licences, and repository hygiene.
- Record known limitations honestly with no secrets or local databases committed.

## Case 12: Optional bonus functionality

Success criteria:

- Begin only after every P0 acceptance criterion passes.
- Select a small feature with a written contract and no deployment-risk increase.
- Preserve the modular-monolith boundaries and Route53 visual direction.
- Add complete tests and documentation; do not leave partial bonus navigation.
- Re-run the full P0 regression suite before considering the bonus complete.
