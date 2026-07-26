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

## Implemented Case 5 foundation

The frontend now exposes:

- `/login`
- `/route53/dashboard`
- `/route53/hosted-zones`
- `/route53/traffic-policies`
- `/route53/health-checks`
- `/route53/resolver`
- `/route53/profiles`

The root route selects login or dashboard after client-side session restoration,
and `/route53` selects the dashboard. The Route 53 routes are protected by a
client gate because the mocked bearer token is intentionally browser-local and
unavailable to server middleware. Protected content is not rendered before
authentication finishes. Traffic policies, health checks, resolver, and profiles
are honest “Coming soon” surfaces; Hosted zones identifies Case 6 without
fabricating data.

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

The primary hosted-zone page includes a title, short operational description,
create action, result count, toolbar, and bordered table. Columns are selection,
domain name, type, record count, comment, and created date. Domain names are blue
links. Rows are compact and keyboard navigable. Selection enables only relevant
bulk actions; Case 8 will define bulk behaviour.

## Hosted Zone creation form

The form is a white bordered surface with:

- Domain name, including guidance about accepted DNS format
- Public/private zone-type choice with concise consequences
- Optional comment
- Cancel and restrained-orange Create hosted zone actions

Validation appears next to fields and in an accessible summary when submission
fails. Successful creation navigates to zone details and raises a toast.

## Hosted Zone details

The page shows breadcrumbs, zone name, type/status metadata, ID, comment, created
time, and record count. Primary tabs or sections separate Records and Zone
details. The delete-zone action is visually secondary and isolated from routine
record creation.

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
navigation works. Search submits on Enter and has a clear action. Filters show
their active state and can be reset together. Sortable column headers expose
direction to assistive technology. Pagination includes page size, previous/next,
current range, and total, while retaining search/filter/sort parameters.

## Destructive confirmations

Deleting a zone or record opens a focus-trapped confirmation dialog. It names the
resource, explains cascade impact, and requires explicit confirmation. Zone
deletion may require typing the zone name. Cancel receives initial focus where
appropriate; Escape closes when no submission is active. Buttons cannot be
double-submitted.

## Toasts

Short success and error notifications appear in a consistent live region. They
describe the completed operation and resource rather than saying only “Success”.
Persistent or actionable errors also remain near the affected content; toasts
are not the sole error channel.

## Loading, error, and empty states

- Initial loading uses compact table skeletons with stable page geometry.
- Background refresh preserves existing rows and shows a small progress indicator.
- Errors provide a plain-language summary, retry action, and request context
  without leaking internals.
- A first-use empty state explains hosted zones and offers creation.
- A filtered empty state says no results matched and offers to clear filters.
- Controls expose disabled and busy states during mutations.

## Placeholder sections

DNS health checks, traffic flow, resolver, domain registration, query logging,
and real routing policies may appear only as clearly disabled or “Not included in
this assignment” navigation placeholders after P0 workflows are complete. They
must not resemble functional controls or displace core tasks.
