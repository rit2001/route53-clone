# Route53 Clone agent guide

## Objective

Build a maintainable Route53-inspired web application for managing mocked hosted
zones and DNS record sets. Prioritise required P0 assignment functionality before
any bonus work. Never imply that planned functionality is already implemented.

## Architecture contracts

- Keep one modular monolith split into `frontend`, `backend`, and `docs`.
- Backend calls flow `API router -> service -> repository -> SQLAlchemy/database`.
  Route handlers handle HTTP concerns only; business rules belong in services.
- Keep module dependencies directed inward. Repositories must not depend on API
  modules.
- TanStack Query owns server state; React Hook Form with Zod owns forms; URL
  search parameters own search, filters, and pagination.
- React Context is allowed only for the mocked authentication session. Use local
  state for modal visibility and table selection.
- Do not add microservices, external queues/caches, GraphQL, WebSockets, AWS SDK
  calls, real DNS, or real AWS authentication.
- SQLite production runs with exactly one Uvicorn worker and a Railway volume at
  `/data`; do not weaken this constraint.

## Conventions

- Inspect relevant existing code and documentation before changing anything.
- Python files and functions use `snake_case`; classes use `PascalCase`; constants
  use `UPPER_SNAKE_CASE`.
- TypeScript components and exported types use `PascalCase`; hooks use `useX`;
  other functions and variables use `camelCase`; route folders use kebab-case.
- Use typed Pydantic schemas at API boundaries and strict TypeScript throughout.
- Keep API paths plural, versioned under `/api/v1`, and consistent with
  `docs/api-contract.md`.
- Use original source and local assets. Do not copy AWS logos or proprietary
  artwork.

## Quality rules

- Preserve unrelated work and avoid broad formatting or dependency rewrites.
- Do not leave TODOs in functionality described as complete.
- Never silently change an API contract; update the contract documentation and
  call the change out in the task report.
- Add or update tests for changed behaviour. Tests must not use external services.
- Fix lint, type, test, and build failures caused by the task.
- Report all created and modified files and any command that could not be run.

## Required completion checks

Run from the appropriate directory before finishing:

```bash
cd frontend
npm run lint
npm run typecheck
npm run build

cd ../backend
pytest
python -c "from app.main import app; print(app.title)"

cd ..
docker compose config
```

Run additional focused tests for the code changed. Never claim success for a
command that was skipped or failed.

## Visual direction

The interface must feel like an operational Route53 console: dark utility header,
light service navigation, dense layout, compact type, small radii, visible table
borders, neutral-grey backgrounds, white surfaces, blue links, restrained orange
primary actions, breadcrumbs, operational tables, search/filter toolbars,
confirmation dialogs, toasts, and explicit loading/error/empty states.

Avoid gradients, glassmorphism, excessive shadows, oversized rounded cards,
marketing-page layouts, decorative animation, and copied AWS assets.
