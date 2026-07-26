# API contract

The system, authentication, and hosted-zone routes are implemented. General
DNS-record routes remain planned and must not be treated as available yet.

## General conventions

- Base path: `/api/v1`
- Media type: `application/json`
- Identifiers: opaque UUID strings except Route53-inspired hosted-zone IDs
- Dates: UTC ISO 8601 strings, for example `2026-07-26T12:30:00Z`
- DNS names: returned in normalised lowercase form with a trailing dot
- Authentication: opaque token in `Authorization: Bearer <token>`
- Unknown JSON fields: rejected for write requests

## Authentication

### `POST /api/v1/auth/login`

Implemented request:

```json
{
  "email": "demo@route53.local",
  "password": "Route53Demo123!"
}
```

Email is stripped and lowercased before lookup. Email must be plausibly
structured and no longer than 320 characters; password must be non-empty and no
longer than 1024 characters.

Implemented `200 OK` response:

```json
{
  "access_token": "raw-opaque-token-returned-once",
  "token_type": "bearer",
  "expires_at": "2026-07-27T12:30:00Z",
  "user": {
    "id": "0d79eac8-aef2-47ff-b331-d240a967ff39",
    "name": "Route53 Demo User",
    "email": "demo@route53.local",
    "created_at": "2026-07-26T12:30:00Z"
  }
}
```

The raw token has at least 256 bits of entropy and is returned only by this
response. The database stores its SHA-256 hash. Each successful login creates an
independent persistent session expiring after `SESSION_TTL_HOURS`.

Unknown email and incorrect password both return:

```json
{
  "detail": {
    "code": "INVALID_CREDENTIALS",
    "message": "The email or password is incorrect."
  }
}
```

The response status is `401 Unauthorized` with `WWW-Authenticate: Bearer`.

### `POST /api/v1/auth/logout`

Requires a valid bearer token, deletes only that database session, and returns
`204 No Content` with no response body. Missing, malformed, unknown, or expired
sessions return the standard authentication error instead.

### `GET /api/v1/auth/me`

Requires a valid bearer token and returns the user object shown above. It never
returns `password_hash`, sessions, or ORM state.

Authentication errors:

- Missing header: `AUTHENTICATION_REQUIRED`
- Incorrect scheme, malformed token, unknown token, or logged-out token:
  `INVALID_SESSION`
- Expired token: `SESSION_EXPIRED`; the expired row is deleted

Every authentication `401` includes `WWW-Authenticate: Bearer`.

## Hosted zones

All hosted-zone endpoints require a valid opaque bearer session. Every operation
is scoped to the authenticated user's ID; a missing zone and a zone owned by
another user return the same `HOSTED_ZONE_NOT_FOUND` response.

List item:

```json
{
  "id": "Z08719372Q4ABCDEF92XY",
  "name": "example.com.",
  "zone_type": "PUBLIC",
  "comment": "Primary application zone",
  "record_count": 2,
  "created_at": "2026-07-26T12:30:00Z",
  "updated_at": "2026-07-26T12:30:00Z"
}
```

Detail responses add the persisted mocked name servers:

```json
{
  "id": "Z08719372Q4ABCDEF92XY",
  "name": "example.com.",
  "zone_type": "PUBLIC",
  "comment": "Primary application zone",
  "record_count": 2,
  "name_servers": [
    "ns-148.mockdns-18.route53-clone.invalid.",
    "ns-902.mockdns-48.route53-clone.invalid.",
    "ns-1214.mockdns-23.route53-clone.invalid.",
    "ns-1937.mockdns-50.route53-clone.invalid."
  ],
  "created_at": "2026-07-26T12:30:00Z",
  "updated_at": "2026-07-26T12:30:00Z"
}
```

The examples communicate the local fake hostname format; actual persisted
values are deterministically derived from the local hosted-zone ID and are not
AWS name servers.

### `GET /api/v1/hosted-zones`

Implemented. Returns a paginated list owned by the current user. Record counts
are calculated by an aggregate query and include system and future user-managed
record sets.

Parameters:

- `search`: optional trimmed, case-insensitive partial match on name or comment
- `zone_type`: optional `PUBLIC` or `PRIVATE`
- `page`: integer, default `1`, minimum `1`
- `page_size`: integer, default `10`, range `1..100`
- `sort_by`: `name`, `zone_type`, `created_at`, or `updated_at`; default `name`
- `sort_order`: `asc` or `desc`; default `asc`

An empty search is treated as absent. Sorting uses hosted-zone ID as a
deterministic secondary key so pagination does not repeat rows.

Implemented `200 OK` response:

```json
{
  "items": [],
  "page": 1,
  "page_size": 10,
  "total": 0,
  "total_pages": 0
}
```

### `POST /api/v1/hosted-zones`

Implemented request:

```json
{
  "name": "example.com",
  "zone_type": "PUBLIC",
  "comment": "Primary application zone"
}
```

Unknown fields are rejected. `name` and `zone_type` are required; `comment` is
optional, trimmed, limited to 256 characters, and stored as `null` when empty.
The client cannot set ownership, identifiers, counts, or timestamps.

The service strips surrounding whitespace from the name, lowercases it,
validates ASCII DNS labels, and stores exactly one trailing dot. It rejects URL
schemes, paths, ports, email addresses, wildcards, empty labels, invalid
hyphens, overlong names or labels, non-ASCII names, and top-level-only values.
No DNS lookup occurs.

Returns `201 Created` with the detail representation and a `Location` header.
For a public zone, the same transaction creates:

- one `NS` system record set with four deterministic, unique mocked name servers
  and TTL `172800`;
- one `SOA` system record set using the first name server and TTL `900`.

Both record sets are simple-routing, non-alias, and marked `is_system=true`.
The zone plus both record sets commit atomically. Private zones currently create
no system records or mocked VPC fields and return `record_count: 0` with an empty
`name_servers` list.

The same user cannot create the same canonical name and type twice. Public and
private variants may coexist, and another user may independently use the same
name and type. A duplicate returns `409 HOSTED_ZONE_ALREADY_EXISTS`.

### `GET /api/v1/hosted-zones/{zone_id}`

Implemented. Returns `200` with the detail representation when the zone belongs
to the current user. `name_servers` comes from the persisted system NS record;
it is never regenerated on read. Missing or unowned zones return
`404 HOSTED_ZONE_NOT_FOUND`, so ownership is not disclosed.

### `PATCH /api/v1/hosted-zones/{zone_id}`

Implemented request:

```json
{
  "comment": "Updated operational note"
}
```

Only `comment` is mutable. It is trimmed, limited to 256 characters, and may be
cleared with `null` or whitespace. An empty object and unknown or immutable
fields are rejected with `422`. Name, type, ID, and owner are immutable to match
Route53-style zone semantics. Returns `200` with the updated detail response
without changing or recreating records.

### `DELETE /api/v1/hosted-zones/{zone_id}`

Implemented. Deletes the owned zone and all associated system and user-managed
record sets through the database cascade. Returns `204 No Content` with no body.
Missing or unowned zones return `404 HOSTED_ZONE_NOT_FOUND`.

Hosted-zone application errors:

- `HOSTED_ZONE_NOT_FOUND`: `404`
- `HOSTED_ZONE_ALREADY_EXISTS`: `409`
- `HOSTED_ZONE_CREATION_FAILED`: safe `500` after a rolled-back creation
- `VALIDATION_ERROR`: `422` for domain rules enforced by the service

Pydantic field and query validation continues to use FastAPI's standard `422`
validation-detail list.

## DNS record sets

`DNSRecord` represents one record set. Multiple values for the same name, type,
and TTL are stored and returned together.

Supported types are `A`, `AAAA`, `CNAME`, `TXT`, `MX`, `NS`, `PTR`, `SRV`, and
`CAA`.

Record-set representation:

```json
{
  "id": "e2335892-7059-4618-b617-3046449862f7",
  "hosted_zone_id": "Z08719372Q4ABCDEF92XY",
  "name": "www.example.com.",
  "type": "A",
  "ttl": 300,
  "values": ["192.0.2.10", "192.0.2.11"],
  "is_system": false,
  "created_at": "2026-07-26T12:35:00Z",
  "updated_at": "2026-07-26T12:35:00Z"
}
```

### `GET /api/v1/hosted-zones/{zone_id}/records`

Returns a paginated list for an owned hosted zone.

Parameters:

- `page`: integer, default `1`, minimum `1`
- `page_size`: integer, default `10`, allowed `10`, `25`, `50`, `100`
- `search`: case-insensitive partial match on record name or value
- `record_type`: one supported record type; may be repeated
- `system`: optional boolean filter
- `sort`: `name`, `type`, `ttl`, `created_at`, or `updated_at`
- `order`: `asc` or `desc`

The response uses the standard pagination envelope.

### `POST /api/v1/hosted-zones/{zone_id}/records`

Planned request:

```json
{
  "name": "www",
  "type": "A",
  "ttl": 300,
  "values": ["192.0.2.10", "192.0.2.11"]
}
```

Relative names are resolved within the zone; `@` represents the zone apex.
Returns `201 Created` with the record-set representation and a `Location` header.
Duplicate values are rejected or normalised before persistence according to the
type validator.

### `GET /api/v1/hosted-zones/{zone_id}/records/{record_id}`

Returns `200` for a record in the owned zone. A missing zone, unowned zone, or
record outside that zone returns `404`.

### `PATCH /api/v1/hosted-zones/{zone_id}/records/{record_id}`

Planned request (at least one field):

```json
{
  "ttl": 60,
  "values": ["192.0.2.12"]
}
```

Record name and type are immutable; the client creates a replacement when those
must change. System NS and SOA records cannot be changed. Returns `200`.

### `DELETE /api/v1/hosted-zones/{zone_id}/records/{record_id}`

Deletes a user-managed record set and returns `204 No Content`. System record
sets return `409 Conflict`.

## Health

### `GET /api/v1/health`

Implemented in Case 0. It is public and does not require the database.

```json
{
  "status": "healthy",
  "service": "route53-clone-api",
  "environment": "development"
}
```

## Standard errors

All expected application errors use:

```json
{
  "detail": {
    "code": "ERROR_CODE",
    "message": "Human-readable explanation"
  }
}
```

Expected application errors use this object. Pydantic request-schema failures
retain FastAPI's standard `422` validation-detail list so clients receive precise
field locations and messages.

Implemented codes include `AUTHENTICATION_REQUIRED`, `INVALID_CREDENTIALS`,
`INVALID_SESSION`, `SESSION_EXPIRED`, `HOSTED_ZONE_NOT_FOUND`,
`HOSTED_ZONE_ALREADY_EXISTS`, `HOSTED_ZONE_CREATION_FAILED`,
`VALIDATION_ERROR`, and `INTERNAL_ERROR`. `SYSTEM_RECORD_PROTECTED` remains
planned for Case 4.

## HTTP status conventions

- `200 OK`: successful reads, updates, login, and current-session lookup
- `201 Created`: successful hosted zone or record-set creation
- `204 No Content`: successful logout or delete
- `401 Unauthorized`: missing, invalid, expired, or revoked session
- `404 Not Found`: missing or unowned resource
- `409 Conflict`: uniqueness conflict or protected system-record operation
- `422 Unprocessable Content`: request-schema or domain validation failure
- `500 Internal Server Error`: unexpected server failure with no internals leaked
