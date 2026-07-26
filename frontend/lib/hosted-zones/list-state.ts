import type {
  HostedZoneListParams,
  HostedZoneSortField,
  HostedZoneType,
  SortOrder,
} from "@/types/hosted-zone";

export const DEFAULT_HOSTED_ZONE_LIST_STATE: HostedZoneListParams = {
  page: 1,
  page_size: 10,
  sort_by: "name",
  sort_order: "asc",
};

export const HOSTED_ZONE_PAGE_SIZES = [10, 25, 50, 100] as const;
const ZONE_TYPES = new Set<HostedZoneType>(["PUBLIC", "PRIVATE"]);
const SORT_FIELDS = new Set<HostedZoneSortField>([
  "name",
  "zone_type",
  "created_at",
  "updated_at",
]);
const SORT_ORDERS = new Set<SortOrder>(["asc", "desc"]);
const FEATURE_KEYS = [
  "search",
  "zone_type",
  "page",
  "page_size",
  "sort_by",
  "sort_order",
] as const;

function positiveInteger(value: string | null, fallback: number): number {
  if (!value || !/^\d+$/.test(value)) {
    return fallback;
  }
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed >= 1 ? parsed : fallback;
}

export function parseHostedZoneListState(
  searchParams: URLSearchParams,
): HostedZoneListParams {
  const search = searchParams.get("search")?.trim() || undefined;
  const requestedType = searchParams.get("zone_type");
  const requestedPageSize = positiveInteger(
    searchParams.get("page_size"),
    DEFAULT_HOSTED_ZONE_LIST_STATE.page_size,
  );
  const requestedSort = searchParams.get("sort_by");
  const requestedOrder = searchParams.get("sort_order");

  return {
    ...(search ? { search } : {}),
    ...(requestedType && ZONE_TYPES.has(requestedType as HostedZoneType)
      ? { zone_type: requestedType as HostedZoneType }
      : {}),
    page: positiveInteger(
      searchParams.get("page"),
      DEFAULT_HOSTED_ZONE_LIST_STATE.page,
    ),
    page_size: HOSTED_ZONE_PAGE_SIZES.includes(
      requestedPageSize as (typeof HOSTED_ZONE_PAGE_SIZES)[number],
    )
      ? requestedPageSize
      : DEFAULT_HOSTED_ZONE_LIST_STATE.page_size,
    sort_by:
      requestedSort &&
      SORT_FIELDS.has(requestedSort as HostedZoneSortField)
        ? (requestedSort as HostedZoneSortField)
        : DEFAULT_HOSTED_ZONE_LIST_STATE.sort_by,
    sort_order:
      requestedOrder && SORT_ORDERS.has(requestedOrder as SortOrder)
        ? (requestedOrder as SortOrder)
        : DEFAULT_HOSTED_ZONE_LIST_STATE.sort_order,
  };
}

export type HostedZoneListStatePatch = Partial<HostedZoneListParams>;

export function updateHostedZoneListSearchParams(
  current: URLSearchParams,
  patch: HostedZoneListStatePatch,
): URLSearchParams {
  const state = { ...parseHostedZoneListState(current), ...patch };
  const changesOperationalState = Object.keys(patch).some(
    (key) => key !== "page",
  );
  if (changesOperationalState && patch.page === undefined) {
    state.page = 1;
  }

  const next = new URLSearchParams(current);
  FEATURE_KEYS.forEach((key) => next.delete(key));

  const search = state.search?.trim();
  if (search) {
    next.set("search", search);
  }
  if (state.zone_type) {
    next.set("zone_type", state.zone_type);
  }
  if (state.page !== DEFAULT_HOSTED_ZONE_LIST_STATE.page) {
    next.set("page", String(state.page));
  }
  if (state.page_size !== DEFAULT_HOSTED_ZONE_LIST_STATE.page_size) {
    next.set("page_size", String(state.page_size));
  }
  if (state.sort_by !== DEFAULT_HOSTED_ZONE_LIST_STATE.sort_by) {
    next.set("sort_by", state.sort_by);
  }
  if (state.sort_order !== DEFAULT_HOSTED_ZONE_LIST_STATE.sort_order) {
    next.set("sort_order", state.sort_order);
  }

  return next;
}

export function hasHostedZoneFilters(params: HostedZoneListParams): boolean {
  return Boolean(params.search || params.zone_type);
}
