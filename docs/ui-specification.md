# UI specification

The interface is inspired by the operating density and hierarchy of Route53, but
uses original code, language, icons, and visual assets. It is an application
console, not a marketing dashboard.

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

The Case 5 `Breadcrumbs` component accepts data rather than deriving a hardcoded
page list, so zone and record details can add nested items in Cases 6 and 7.

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

Case 5 includes semantic header/main/aside/navigation landmarks, labelled
navigation regions, breadcrumb navigation, `aria-current`, visible global focus
styles, a skip link, field/error associations, native buttons for every action,
keyboard-reachable menus, Escape dismissal, and reduced-motion overrides.
Component tests query by accessible roles and names to protect these contracts.

## Hosted Zones table

Case 6 implements the primary hosted-zone page with a title, real result count,
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

Manage records is visibly disabled and described as Case 7 work; no record table
is fabricated. API-derived 404s use an ownership-safe not-found state. Other
failures remain retryable in page context.

Edit description opens a Radix dialog prepopulated from detail data. It permits
clearing or trimming only the 256-character comment and explains name/type
immutability. Successful PATCH responses refresh lists and update detail
immediately.

## Records table

The records surface provides Create record, search, type filters, refresh, row
selection, and result count. Columns are name, type, routing policy placeholder,
set identifier placeholder, values/traffic target, TTL, and system status where
relevant. Long value lists are readable without making every row tall by default.
Generated NS/SOA records are labelled and protected from edit/delete controls.

## Record form

The create/edit surface includes record name, record type, TTL, and one or more
values. Labels and examples change by type for `A`, `AAAA`, `CNAME`, `TXT`, `MX`,
`NS`, `PTR`, `SRV`, and `CAA`. Users can add/remove value rows. The interface
explains zone-relative names, apex `@`, and why system records cannot be edited.
Changing type resets only incompatible value guidance with explicit confirmation
when data would be lost.

## Search, filters, sorting, and pagination

List state belongs in URL search parameters so views are shareable and browser
navigation works. Case 6 omits default parameters and safely falls back from
invalid values. Changing search, type, page size, or sorting resets page to one;
direct pagination does not.

A 300 ms trimmed search debounce avoids per-keystroke API requests. Empty search
and clear controls remove the parameter. Type filtering uses an accessible native
select. Clearing filters removes their parameters while deliberately preserving
unrelated safe parameters.

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

Case 6 implements each state. Initial list loading keeps page and toolbar context
with compact skeleton rows. Background fetches retain the table. Network failures
mention backend connectivity and offer Retry. First-use and filtered-empty states
have distinct copy and actions. Detail loading, not-found, and retryable failures
use the same operational surfaces.

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

## Placeholder sections

DNS health checks, traffic flow, resolver, domain registration, query logging,
and real routing policies may appear only as clearly disabled or “Not included in
this assignment” navigation placeholders after P0 workflows are complete. They
must not resemble functional controls or displace core tasks.
