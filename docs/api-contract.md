# Planned API contract

This document is the design contract for later cases. Case 0 implements only
`GET /`, `GET /api/v1/health`, and the generated OpenAPI document. All other
routes below are planned and must not be treated as available yet.

## General conventions

- Base path: `/api/v1`
- Media type: `application/json`
- Identifiers: opaque UUID strings except Route53-inspired hosted-zone IDs
- Dates: UTC ISO 8601 strings, for example `2026-07-26T12:30:00Z`
- DNS names: returned in normalised lowercase form with a trailing dot
- Authentication: planned HTTP-only session cookie
- Unknown JSON fields: rejected for write requests

## Authentication

### `POST /api/v1/auth/login`

Planned request:

```json
{
  "email": "intern@example.com",
  "password": "assignment-password"
}
```

Planned `200 OK` response; the session token is set in a secure HTTP-only cookie:

```json
{
  "user": {
    "id": "0d79eac8-aef2-47ff-b331-d240a967ff39",
    "email": "intern@example.com",
    "display_name": "Route53 Operator"
  },
  "expires_at": "2026-07-27T12:30:00Z"
}
```

Invalid credentials return `401`; a new session may supersede an expired cookie.

### `POST /api/v1/auth/logout`

Revokes the current session and clears its cookie. Returns `204 No Content`.
Calling logout without a current session remains idempotent.

### `GET /api/v1/auth/me`

Returns `200` with the current user object shown above, or `401` when the session
is absent, expired, or revoked.

## Hosted zones

Hosted zone representation:

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

### `GET /api/v1/hosted-zones`

Returns a paginated list owned by the current user.

Parameters:

- `page`: integer, default `1`, minimum `1`
- `page_size`: integer, default `10`, allowed `10`, `25`, `50`, `100`
- `search`: case-insensitive partial match on zone name
- `zone_type`: optional `PUBLIC` or `PRIVATE`
- `sort`: `name`, `created_at`, `updated_at`, or `record_count`
- `order`: `asc` or `desc`

Planned `200 OK` response:

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

Planned request:

```json
{
  "name": "example.com",
  "zone_type": "PUBLIC",
  "comment": "Primary application zone"
}
```

Returns `201 Created` with the hosted zone representation and a `Location`
header. Public zones include generated NS and SOA record sets in their
`record_count`.

### `GET /api/v1/hosted-zones/{zone_id}`

Returns `200` with the hosted zone when it belongs to the current user. Missing or
unowned zones return `404` so ownership is not disclosed.

### `PATCH /api/v1/hosted-zones/{zone_id}`

Planned request (at least one field):

```json
{
  "comment": "Updated operational note"
}
```

Only mutable fields are accepted. Zone name and type are immutable after
creation. Returns `200` with the updated representation.

### `DELETE /api/v1/hosted-zones/{zone_id}`

Deletes the zone and its record sets in one transaction. Returns
`204 No Content`. Missing or unowned zones return `404`.

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

Validation failures will use the same `detail` object with code
`VALIDATION_ERROR`; a future optional `fields` map may identify invalid fields
without changing `code` or `message`.

Common codes include `AUTHENTICATION_REQUIRED`, `INVALID_CREDENTIALS`,
`RESOURCE_NOT_FOUND`, `VALIDATION_ERROR`, `DUPLICATE_RESOURCE`,
`SYSTEM_RECORD_PROTECTED`, and `INTERNAL_ERROR`.

## HTTP status conventions

- `200 OK`: successful reads, updates, login, and current-session lookup
- `201 Created`: successful hosted zone or record-set creation
- `204 No Content`: successful logout or delete
- `400 Bad Request`: malformed domain input not expressible as field validation
- `401 Unauthorized`: missing, invalid, expired, or revoked session
- `404 Not Found`: missing or unowned resource
- `409 Conflict`: uniqueness conflict or protected system-record operation
- `422 Unprocessable Content`: request-schema or domain validation failure
- `500 Internal Server Error`: unexpected server failure with no internals leaked
