# Implementation plan

Case 0 establishes repository structure, contracts, runtime configuration,
health endpoints, database plumbing, a minimal frontend, containers, tests, and
documentation. It deliberately contains no business entities, authentication, or
CRUD workflow.

P0 cases must be completed and stable before optional work. Later frontend cases
will add TanStack Query for server state and cache invalidation, React Hook Form
plus Zod for forms, and a lightweight accessible toast implementation. Those
packages are planned rather than installed in Case 0 because no current code uses
them. Redux and Zustand are outside the architecture.

## Case 1: Database models, migrations and persistence

Success criteria:

- Implement typed SQLAlchemy models for User, Session, HostedZone, and DNSRecord
  exactly within the documented ownership boundaries.
- Add the first Alembic migration with foreign keys, constraints, and indexes.
- Store record-set values together and verify SQLite foreign-key/cascade behaviour.
- Add isolated model and repository persistence tests using temporary databases.
- Confirm upgrade from an empty database and downgrade behaviour.

## Case 2: Mock authentication and persistent sessions

Success criteria:

- Seed or safely bootstrap documented mock users without committing secrets.
- Implement login, logout, and current-user endpoints through router, service, and
  repository layers.
- Store only hashed opaque session tokens, enforce expiry, and use an HTTP-only
  cookie with environment-appropriate security attributes.
- Add authentication dependencies and tests for valid, invalid, expired, revoked,
  and persisted sessions.
- Keep authentication explicitly local; do not add AWS or external identity.

## Case 3: Hosted Zone backend CRUD and tests

Success criteria:

- Implement all documented hosted-zone endpoints and Pydantic schemas.
- Enforce normalisation, validation, ownership, uniqueness, and immutable fields
  in services.
- Create public-zone NS/SOA system records transactionally.
- Keep routers thin and repositories query-focused.
- Cover happy paths, pagination, conflicts, ownership isolation, and cascades.

## Case 4: DNS Record backend CRUD, validation and tests

Success criteria:

- Implement all documented record-set endpoints for every required record type.
- Validate names, TTL, values, zone containment, record-set uniqueness, CNAME
  conflicts, and type-specific syntax.
- Protect generated NS/SOA system records.
- Keep multi-value record sets atomic and consistently normalised.
- Cover valid/invalid examples, ownership isolation, filters, conflicts, and
  delete behaviour.

## Case 5: AWS-style application shell and frontend authentication

Success criteria:

- Build the original dark header, light sidebar, page frame, breadcrumbs, and
  responsive navigation according to the UI specification.
- Add mocked login/session restoration/logout against the backend.
- Restrict React Context to authentication state.
- Provide accessible loading and failure behaviour without fake production data.
- Add focused component tests where the chosen test tooling provides value.

## Case 6: Hosted Zones frontend workflow

Success criteria:

- Add TanStack Query and implement hosted-zone list, create, detail, edit-comment,
  and delete workflows.
- Add React Hook Form and Zod with backend-error mapping.
- Provide empty, loading, refreshing, error, success, and confirmation states.
- Invalidate or update caches intentionally after mutations.
- Match the API contract and dense operational visual direction.

## Case 7: DNS Records frontend workflow

Success criteria:

- Implement record list, create, detail/edit, and delete workflows.
- Provide type-aware controls and guidance for every required record type.
- Support multiple values as one record set and protect system records in the UI.
- Preserve backend validation as authoritative and render its errors clearly.
- Verify keyboard and screen-reader operation for dynamic value controls.

## Case 8: Search, filtering, pagination and bulk selection

Success criteria:

- Drive list search, filters, sort, page, and page size from URL parameters.
- Keep API queries and navigation stable across refresh/back/forward.
- Add compact result counts, filter reset, and accessible sortable headers.
- Add local-state row selection and only contract-supported bulk actions.
- Test combined query parameters and filtered-empty behaviour.

## Case 9: Visual-polish and accessibility pass

Success criteria:

- Audit spacing, compact typography, borders, actions, responsive layouts, and
  Route53-inspired hierarchy across all workflows.
- Meet meaningful keyboard, focus, label, semantic table, dialog, and live-region
  requirements.
- Check contrast and reduced-motion expectations.
- Remove placeholder UI that distracts from P0; retain only honest labels.
- Validate loading, error, empty, overflow, and long-DNS-value edge cases.

## Case 10: Docker, CI and deployment

Success criteria:

- Review and harden both Dockerfiles and Compose configuration.
- Add CI for backend tests plus frontend lint, type checking, and builds.
- Configure Vercel frontend deployment and Railway backend deployment.
- Mount Railway persistence at `/data`, set the production database URL, and run
  exactly one Uvicorn worker.
- Document migration and rollback procedures and verify deployed health/CORS.

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
