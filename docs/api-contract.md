# API contract

The system, authentication, Hosted Zone, and DNS record-set routes are
implemented.

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
and TTL are stored and returned together in stable first-seen order.

User-created types are `A`, `AAAA`, `CNAME`, `TXT`, `MX`, `NS`, `PTR`, `SRV`,
and `CAA`. `SOA` is readable but reserved for generated system records. Every
endpoint first resolves the authenticated user's Hosted Zone; an unowned zone
returns `HOSTED_ZONE_NOT_FOUND`. Record lookup is then scoped by both zone and
record ID.

Record-set representation:

```json
{
  "id": "e2335892-7059-4618-b617-3046449862f7",
  "name": "www.example.com.",
  "record_type": "A",
  "values": ["192.0.2.10", "192.0.2.11"],
  "ttl": 300,
  "routing_policy": "SIMPLE",
  "alias": false,
  "is_system": false,
  "created_at": "2026-07-26T12:35:00Z",
  "updated_at": "2026-07-26T12:35:00Z"
}
```

### `GET /api/v1/hosted-zones/{zone_id}/records`

Implemented. Returns a paginated list for an owned Hosted Zone, including
generated NS/SOA records.

Parameters:

- `search`: trimmed, case-insensitive partial match on owner name or serialized
  record values; empty text is ignored
- `record_type`: optional readable type, including `SOA`
- `routing_policy`: optional `SIMPLE`
- `alias`: optional boolean matching persisted alias state
- `page`: integer, default `1`, minimum `1`
- `page_size`: integer, default `25`, range `1..100`
- `sort_by`: `name`, `record_type`, `ttl`, `created_at`, or `updated_at`;
  default `name`
- `sort_order`: `asc` or `desc`; default `asc`

Sorting uses record ID as a deterministic secondary key. The response uses:

```json
{
  "items": [],
  "page": 1,
  "page_size": 25,
  "total": 0,
  "total_pages": 0
}
```

### `POST /api/v1/hosted-zones/{zone_id}/records`

Implemented request:

```json
{
  "name": "api",
  "record_type": "A",
  "values": ["192.0.2.10", "192.0.2.11"],
  "ttl": 300,
  "routing_policy": "SIMPLE",
  "alias": false
}
```

`name` defaults to the zone apex. Empty text, whitespace, `@`, or the canonical
zone name resolves to the apex. Relative names are appended to the zone, while
already-qualified in-zone names are preserved. Absolute outside-zone names,
invalid labels, URLs, paths, ports, email-like names, and non-ASCII input are
rejected. Owner labels may use a single leading underscore, and one wildcard is
allowed only as the complete leftmost label. This supports names such as
`_sip._tcp.example.com.` and `*.api.example.com.`.

At least one and at most 100 values are accepted. Values are normalized by type
and then stably deduplicated:

- `A`: canonical IPv4 addresses, without CIDR or ports
- `AAAA`: compressed lowercase IPv6 addresses, without CIDR
- `CNAME`: exactly one canonical non-IP hostname target
- `TXT`: trimmed quoted or unquoted text; quotes and internal spaces are retained
- `MX`: `<0..65535 priority> <canonical hostname>`
- `NS`: one or more canonical hostname targets
- `PTR`: one or more canonical hostname targets
- `SRV`: `<priority> <weight> <port> <canonical hostname>`, with each number
  in `0..65535`
- `CAA`: `<0..255 flags> <ASCII tag> "<policy>"`; policy quotes are required

Hostname targets may be external to the Hosted Zone but cannot be IP addresses,
URLs, paths, ports, wildcard names, or underscore owner labels. The root target
`.` is rejected for simplicity.

`ttl` is limited to `1..2147483647`. Only `SIMPLE` routing is available.
`alias=true` returns `422 ALIAS_NOT_SUPPORTED`; no alias target is modeled.
Unknown fields and client-controlled IDs, ownership, timestamps, and
`is_system` are rejected. User requests cannot select `SOA`.

The service checks record-set uniqueness and CNAME coexistence before inserting,
then flushes and commits once. Normalization or conflict failures create no row.
Returns `201 Created` with the representation and a `Location` header.

CNAME rules:

- a CNAME cannot exist at the Hosted Zone apex;
- a CNAME cannot coexist with any other type at one owner name;
- no other type can be created where a CNAME exists.

### `GET /api/v1/hosted-zones/{zone_id}/records/{record_id}`

Implemented. Returns `200` for a user-created or system record in the owned zone.
A record ID from another zone or an unknown ID returns
`DNS_RECORD_NOT_FOUND`; an unowned zone returns `HOSTED_ZONE_NOT_FOUND`.

### `PATCH /api/v1/hosted-zones/{zone_id}/records/{record_id}`

Implemented request:

```json
{
  "values": ["192.0.2.20", "192.0.2.21"],
  "ttl": 600
}
```

At least one non-null field is required. Type-specific value validation and
stable deduplication run again. Name, type, ID, zone, routing policy, alias state,
and system state are immutable. Returns `200` with the same record ID and an
updated timestamp. Generated system NS/SOA returns
`409 SYSTEM_RECORD_PROTECTED`.

### `DELETE /api/v1/hosted-zones/{zone_id}/records/{record_id}`

Implemented. Deletes a user-managed record set and returns `204 No Content` with
no body. A second delete returns `DNS_RECORD_NOT_FOUND`. Generated system NS/SOA
returns `409 SYSTEM_RECORD_PROTECTED`. User-created delegated-subdomain NS sets
remain editable and deletable.

Record application errors:

- `DNS_RECORD_NOT_FOUND`: `404`
- `DNS_RECORD_ALREADY_EXISTS`: `409`
- `CNAME_CONFLICT`: `409`
- `SYSTEM_RECORD_PROTECTED`: `409`
- `ALIAS_NOT_SUPPORTED`: `422`
- `DNS_RECORD_CREATION_FAILED`: safe `500` after rollback
- `VALIDATION_ERROR`: `422` for service-level name or value validation

This API stores mocked control-plane data only. It performs no DNS lookup,
publication, delegation, or resolution.

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
`DNS_RECORD_NOT_FOUND`, `DNS_RECORD_ALREADY_EXISTS`, `CNAME_CONFLICT`,
`SYSTEM_RECORD_PROTECTED`, `ALIAS_NOT_SUPPORTED`,
`DNS_RECORD_CREATION_FAILED`, `VALIDATION_ERROR`, and `INTERNAL_ERROR`.

## HTTP status conventions

- `200 OK`: successful reads, updates, login, and current-session lookup
- `201 Created`: successful hosted zone or record-set creation
- `204 No Content`: successful logout or delete
- `401 Unauthorized`: missing, invalid, expired, or revoked session
- `404 Not Found`: missing or unowned resource
- `409 Conflict`: uniqueness conflict or protected system-record operation
- `422 Unprocessable Content`: request-schema or domain validation failure
- `500 Internal Server Error`: unexpected server failure with no internals leaked
