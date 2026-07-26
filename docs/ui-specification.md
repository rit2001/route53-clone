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

## Global header

The 44-pixel-class dark header identifies Route53 Clone, offers a skip link,
shows environment context when useful, and exposes the mocked user's compact
account/logout menu. It remains visually subordinate to page tasks.

## Service sidebar

The light sidebar contains Overview, Hosted zones, and clearly labelled
non-functional placeholder destinations for future Route53-like areas. Active and
hover states use borders/backgrounds rather than motion. On small screens it
becomes an accessible disclosure menu.

## Breadcrumbs

Every workflow below the overview shows text breadcrumbs between the service
navigation and page heading. Zone details include the zone name. Record creation
includes Hosted zones, the zone, Records, and Create record. Links remain blue;
the current page is plain text with `aria-current`.

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
