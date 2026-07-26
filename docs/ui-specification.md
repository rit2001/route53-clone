# UI specification

The interface is inspired by the operating density and hierarchy of Route53, but
uses original code, language, icons, and visual assets. It is an application
console, not a marketing dashboard.

The implemented interface is deployed at
<https://route53-clone-three.vercel.app>. Sanitized production captures are in
[`docs/screenshots`](screenshots/).

## Visual foundation

- Dark global utility header with compact product identity and session controls
- Light service navigation and a persistent desktop service sidebar
- Neutral-grey page background and white content surfaces
- Compact typography, small border radii, and restrained spacing
- Visible table borders, row separators, and clear selected/focus states
- Blue text links for navigation and restrained orange primary actions
- Minimal shadows, no gradients or glass effects, and no decorative animation
- Responsive behaviour that preserves task order instead of turning every region
  into oversized cards

Copied AWS logos, screenshots, or proprietary assets are prohibited.

## Implemented frontend foundation

The frontend exposes:

- `/login`
- `/route53/dashboard`
- `/route53/hosted-zones`
- `/route53/hosted-zones/new`
- `/route53/hosted-zones/{zoneId}`
- `/route53/hosted-zones/{zoneId}/records`
- `/route53/traffic-policies`
- `/route53/health-checks`
- `/route53/resolver`
- `/route53/profiles`

The root route selects login or dashboard after client-side session restoration,
and `/route53` selects the dashboard. The Route 53 routes are protected by a
client gate because the mocked bearer token is intentionally browser-local and
unavailable to server middleware. Protected content is not rendered before
authentication finishes. Traffic policies, health checks, resolver, and profiles
remain honest “Coming soon” surfaces.

Implemented visual tokens include a charcoal global header, white sidebar and
surfaces, neutral-grey page, thin grey borders, compact text, blue links,
restrained orange actions, a red danger treatment, an accessible blue focus ring,
three-pixel radii, and minimal panel/menu shadows. Tokens live in `globals.css`;
components use semantic variables rather than claiming exact AWS branding.

## Global header

The implemented 44-pixel dark header identifies the original “Cloud Console” and
“Route 53 Clone” marks without an AWS logo. It includes a `Mock` context badge, a
`Global` service indicator, the demo user's compact account menu, and sign-out.
The menu uses buttons, explicit expanded state, named menu semantics, outside
click handling, and Escape dismissal. A keyboard-visible skip link targets the
main content.

## Service sidebar

The light sidebar groups Dashboard and Hosted zones under Route 53, Traffic
policies and Health checks under Traffic management, and Resolver and Profiles
under Network services. Active links expose `aria-current="page"` and use a
border/background rather than motion. At widths below the desktop breakpoint it
becomes a labelled overlay drawer. The header button opens it, Escape or either
close control dismisses it, opening transfers focus to its close button, and
closing returns focus to the opener where practical. Navigation selection closes
the drawer.

## Breadcrumbs

Every workflow below the overview shows text breadcrumbs between the service
navigation and page heading. Zone details include the zone name. Record creation
includes Hosted zones, the zone, Records, and Create record. Links remain blue;
the current page is plain text with `aria-current`.

The `Breadcrumbs` component accepts data rather than deriving a hardcoded page
list, so zone and record details add nested items consistently.

## Page headers and placeholder surfaces

The reusable operational page header supports title, compact description,
breadcrumbs, actions, and secondary content. It deliberately has no hero
treatment. The dashboard provides an honest mocked-DNS notice and getting-started
links without fabricated resource metrics. A reusable placeholder gives each
out-of-scope service its own description, a small `Coming soon` badge, and no
fake controls.

## Login and session restoration

The login view uses React Hook Form and Zod for bounded email/password validation.
It provides labelled fields, meaningful autocomplete values, Enter submission,
password visibility control, busy state, an inline semantic error alert, and a
button that fills—but never submits—the public demo credentials.

On login, the typed client stores only the opaque token and ISO expiry in
`route53_clone_session`. On startup, expired or malformed local data is removed
before any request; otherwise `/auth/me` validates the token and restores the user
in memory. Authentication status stays `loading` until that decision completes.
Invalid backend sessions clear local state. Logout attempts backend revocation,
then always clears local state and TanStack Query caches even after a network
failure.

Local storage is a conscious mocked-assignment compromise, not guidance for
production credentials: scripts running in the origin can read it. The public
demo password and token are never stored together, credentials are not logged,
and a security-sensitive production application would reconsider HTTP-only
cookie sessions and the wider browser threat model.

The login `next` parameter accepts only an internal path, rejects protocol-relative
or malformed values and `/login`, and falls back to `/route53/dashboard`.

## Loading and error foundation

Session restoration uses a full-page state shaped like the final console: compact
dark header, desktop sidebar silhouette, bordered status surface, accessible
live status, and reduced-motion-aware spinner. Buttons reuse the same compact
spinner. The error alert uses `role="alert"`, safe backend messages, and an
optional retry action; important form failures are never toast-only.

## Accessibility decisions

The shell includes semantic header/main/aside/navigation landmarks, labelled
navigation regions, breadcrumb navigation, `aria-current`, visible global focus
styles, a skip link, field/error associations, native buttons for every action,
keyboard-reachable menus, Escape dismissal, and reduced-motion overrides.
Component tests query by accessible roles and names to protect these contracts.

## Hosted Zones table

The primary hosted-zone page has a title, real result count,
two-row toolbar, and bordered table. Columns are selection, hosted-zone name,
type, record count, description, ID, and created time. Name, type, created, and
updated are supported backend sort fields; visible sortable columns use buttons
and `aria-sort`. Names are canonical blue links and IDs offer quiet copy controls.

The table is desktop-first with a controlled, keyboard-focusable horizontal
scroll region below the breakpoint rather than a card conversion. Rows have
visible separators, hover and selected treatments, compact UTC timestamps, and
full values in titles where truncation is possible.

Selection is local and scoped to the current URL-derived page. The header
checkbox selects only visible rows. Exactly one selection enables the shared
delete dialog; multiple selection disables deletion and explains that bulk
operations are not included.

The toolbar keeps Refresh and Delete on the left and the restrained-orange Create
action on the right. Refresh retains rows and all URL state while displaying a
small busy indicator.

## Hosted Zone creation form

The implemented `/route53/hosted-zones/new` form is a white bordered surface
using React Hook Form and Zod with:

- Domain name, including guidance about accepted DNS format
- Public/private zone-type choice with concise consequences
- Optional comment
- Cancel and restrained-orange Create hosted zone actions

Validation appears next to fields and in an accessible summary when submission
fails. Successful creation navigates to zone details and raises a toast.
Public is the deliberate default. Selecting Private reveals a mocked-network
notice and never sends a fake VPC field. Comments are counted and bounded at 256
characters; domain validation remains authoritative on the backend. Duplicate,
validation, network, and safe general errors preserve every entered value.

## Hosted Zone details

The dynamic detail page shows breadcrumbs, canonical name, compact type badge,
ID, description, created/updated UTC times, record count, and persisted name
servers from the API. Public zones expose individual and copy-all name-server
controls; private zones explain that no public name servers exist. A notice
states that the clone does not resolve real DNS.

Manage records links to the nested records route. API-derived 404s use an
ownership-safe not-found state. Other failures remain retryable in page context.

Edit description opens a Radix dialog prepopulated from detail data. It permits
clearing or trimming only the 256-character comment and explains name/type
immutability. Successful PATCH responses refresh lists and update detail
immediately.

## Records table

`/route53/hosted-zones/{zoneId}/records` first resolves the
Hosted Zone so the header can show its canonical name, public/private type, ID,
current record count, ownership-safe breadcrumbs, and a direct link back to zone
details. An inline notice says that persisted configuration does not resolve real
DNS.

The two-row toolbar keeps Refresh and Delete record on the left and the orange
Create record action on the right. Search, record type, routing policy, alias
status, and Clear filters occupy a compact second row.

The dense table columns are page-scoped selection, record name, type, routing
policy, alias state, values/traffic target, TTL, and actions. Record name, type,
and TTL are backend-sortable and expose `aria-sort`. Names retain their canonical
trailing dot. Values render one per line rather than as JSON; more than three can
be expanded, and all values or the owner name can be copied.

Generated public-zone NS and SOA sets remain visible, searchable, and filterable.
They carry a restrained `System` label, disabled selection, a `System managed`
action state, and an explanation that they cannot be changed. User-created
records expose discoverable Edit and Delete buttons. Header selection considers
only user-managed rows; exactly one selection enables toolbar deletion and
multiple selection explains that bulk deletion is out of scope.

## Record form

Create and edit use a viewport-bounded, focus-managed wide Radix dialog. The
create editor includes optional record name, one of the nine creatable types,
multiline values, TTL, fixed Simple routing, and an explicit non-alias notice.
Blank or `@` names represent the apex; relative names are appended by the
backend.

Values use one line per record-set value. Empty lines are removed and exact
trimmed duplicates are stably deduplicated without splitting embedded MX, SRV,
TXT, or CAA spaces. Client validation enforces at least one and at most 100
values, a 2048-character line limit, integer TTL `1..2147483647`, and one CNAME
target. Backend record-name and type-specific DNS validation remains
authoritative.

Contextual help and examples are implemented for:

- `A`: `192.0.2.10`
- `AAAA`: `2001:db8::10`
- `CNAME`: `target.example.net.`
- `TXT`: `"verification=value"`
- `MX`: `10 mail.example.com.`
- `NS`: `ns1.example.net.`
- `PTR`: `host.example.com.`
- `SRV`: `10 5 443 service.example.com.`
- `CAA`: `0 issue "letsencrypt.org"`

SOA is never offered in the create selector. Edit displays immutable name/type
context and submits only values and TTL. System records have no edit action, and
the editor itself also refuses a directly supplied system record.

Deletion uses the shared accessible destructive dialog. It shows type, canonical
name, and a bounded values preview, requires an explicit Delete record action,
locks while pending, and remains open with inline feedback on failure. System
records cannot open it through normal row controls, and it independently refuses
their deletion.

## Search, filters, sorting, and pagination

List state belongs in URL search parameters so views are shareable and browser
navigation works. Hosted Zone and DNS Record parsers omit defaults and safely
fall back from invalid values. Record state covers `search`, `record_type`,
`routing_policy`, `alias`, `page`, `page_size`, `sort_by`, and `sort_order`.
Changing operational state resets page to one; direct pagination does not.

A 300 ms trimmed search debounce avoids per-keystroke API requests. Empty search
and clear controls remove the parameter. Record filters expose every readable
type including SOA, Simple routing, and true/false alias status through accessible
native selects. Clearing filters removes their parameters while deliberately
preserving unrelated safe parameters.

Sortable column headers expose direction to assistive technology and request
backend sorting. Pagination reports the visible range and total with compact
Previous/Next buttons and page sizes 10, 25, 50, and 100.

## Destructive confirmations

Deleting a zone opens the same focus-managed Radix confirmation from the list or
details. It names the zone, type, record count, cascade effect, and system-record
impact without implying real delegation. The destructive action stays disabled
until the exact canonical trailing-dot name is typed. Pending deletion locks
dismissal and controls; failure stays inline and recoverable; success invalidates
lists, removes detail cache, and returns detail callers to the list.

## Toasts

Sonner provides short success, refresh, update, deletion, and copy notifications
in a consistent accessible live region. They describe the operation and resource
rather than saying only “Success”. Persistent or actionable errors also remain
near the affected content; notifications are not the sole error channel.

## Loading, error, and empty states

- Initial loading uses compact table skeletons with stable page geometry.
- Background refresh preserves existing rows and shows a small progress indicator.
- Errors provide a plain-language summary, retry action, and request context
  without leaking internals.
- A first-use empty state explains hosted zones and offers creation.
- A filtered empty state says no results matched and offers to clear filters.
- Controls expose disabled and busy states during mutations.

Both operational workflows implement each state. Initial list loading keeps page context with
compact table-shaped rows. Background fetches retain data. DNS list failures
mention API connectivity and offer Retry. An empty private zone offers Create
record; filtered emptiness offers Clear filters. Hosted Zone not-found responses
stay ownership-safe.

## Hosted Zone responsive and accessibility decisions

Toolbar controls wrap into compact rows; forms remain at an
infrastructure-setting width; dialogs are viewport-bounded; details collapse from
two columns to one; and the table scrolls inside its labelled region without
causing global overflow. Existing mobile service navigation remains unchanged.

Semantic tables and captions, labelled search/filter/select controls, labelled
row/header checkboxes, `aria-sort`, status announcements, associated form errors,
native buttons, disabled-state descriptions, dialog focus trapping/restoration,
Escape dismissal, and reduced-motion skeleton/spinner behaviour are covered by
component tests.

The records table uses the same labelled, keyboard-focusable horizontal scroll
strategy. Toolbar filters wrap on smaller screens, the values column retains
useful width, and the wide editor scrolls internally with a reachable sticky
footer. Semantic captions, labelled checkboxes, disabled system explanations,
native filter controls, row action buttons, linked form errors, live loading
states, Radix focus restoration, and inline mutation errors protect the records
workflow without replacing the table with generic cards.

## Placeholder sections

Traffic Policies, Health Checks, Resolver, and Profiles are non-functional
navigation placeholders labelled `Coming soon`. They preserve the service-shell
hierarchy without presenting fake controls. Domain registration, query logging,
real routing policies, and other out-of-scope product surfaces are not exposed.
