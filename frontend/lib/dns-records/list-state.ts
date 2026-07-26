import type {
  DNSRecordListParams,
  DNSRecordSortField,
  DNSRecordType,
  RoutingPolicy,
  SortOrder,
} from "@/types/dns-record";

export const DEFAULT_DNS_RECORD_LIST_STATE: DNSRecordListParams = {
  page: 1,
  page_size: 25,
  sort_by: "name",
  sort_order: "asc",
};

export const DNS_RECORD_PAGE_SIZES = [10, 25, 50, 100] as const;
export const DNS_RECORD_TYPES: readonly DNSRecordType[] = [
  "A",
  "AAAA",
  "CNAME",
  "TXT",
  "MX",
  "NS",
  "PTR",
  "SRV",
  "CAA",
  "SOA",
];
const RECORD_TYPES = new Set<DNSRecordType>(DNS_RECORD_TYPES);
const ROUTING_POLICIES = new Set<RoutingPolicy>(["SIMPLE"]);
const SORT_FIELDS = new Set<DNSRecordSortField>([
  "name",
  "record_type",
  "ttl",
  "created_at",
  "updated_at",
]);
const SORT_ORDERS = new Set<SortOrder>(["asc", "desc"]);
const FEATURE_KEYS = [
  "search",
  "record_type",
  "routing_policy",
  "alias",
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

function parseAlias(value: string | null): boolean | undefined {
  if (value === "true") {
    return true;
  }
  if (value === "false") {
    return false;
  }
  return undefined;
}

export function parseDNSRecordListState(
  searchParams: URLSearchParams,
): DNSRecordListParams {
  const search = searchParams.get("search")?.trim() || undefined;
  const requestedType = searchParams.get("record_type");
  const requestedPolicy = searchParams.get("routing_policy");
  const requestedPageSize = positiveInteger(
    searchParams.get("page_size"),
    DEFAULT_DNS_RECORD_LIST_STATE.page_size,
  );
  const requestedSort = searchParams.get("sort_by");
  const requestedOrder = searchParams.get("sort_order");

  return {
    ...(search ? { search } : {}),
    ...(requestedType && RECORD_TYPES.has(requestedType as DNSRecordType)
      ? { record_type: requestedType as DNSRecordType }
      : {}),
    ...(requestedPolicy &&
    ROUTING_POLICIES.has(requestedPolicy as RoutingPolicy)
      ? { routing_policy: requestedPolicy as RoutingPolicy }
      : {}),
    ...(parseAlias(searchParams.get("alias")) !== undefined
      ? { alias: parseAlias(searchParams.get("alias")) }
      : {}),
    page: positiveInteger(
      searchParams.get("page"),
      DEFAULT_DNS_RECORD_LIST_STATE.page,
    ),
    page_size: DNS_RECORD_PAGE_SIZES.includes(
      requestedPageSize as (typeof DNS_RECORD_PAGE_SIZES)[number],
    )
      ? requestedPageSize
      : DEFAULT_DNS_RECORD_LIST_STATE.page_size,
    sort_by:
      requestedSort &&
      SORT_FIELDS.has(requestedSort as DNSRecordSortField)
        ? (requestedSort as DNSRecordSortField)
        : DEFAULT_DNS_RECORD_LIST_STATE.sort_by,
    sort_order:
      requestedOrder && SORT_ORDERS.has(requestedOrder as SortOrder)
        ? (requestedOrder as SortOrder)
        : DEFAULT_DNS_RECORD_LIST_STATE.sort_order,
  };
}

export function updateDNSRecordListSearchParams(
  current: URLSearchParams,
  patch: Partial<DNSRecordListParams>,
): URLSearchParams {
  const state = { ...parseDNSRecordListState(current), ...patch };
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
  if (state.record_type) {
    next.set("record_type", state.record_type);
  }
  if (state.routing_policy) {
    next.set("routing_policy", state.routing_policy);
  }
  if (state.alias !== undefined) {
    next.set("alias", String(state.alias));
  }
  if (state.page !== DEFAULT_DNS_RECORD_LIST_STATE.page) {
    next.set("page", String(state.page));
  }
  if (state.page_size !== DEFAULT_DNS_RECORD_LIST_STATE.page_size) {
    next.set("page_size", String(state.page_size));
  }
  if (state.sort_by !== DEFAULT_DNS_RECORD_LIST_STATE.sort_by) {
    next.set("sort_by", state.sort_by);
  }
  if (state.sort_order !== DEFAULT_DNS_RECORD_LIST_STATE.sort_order) {
    next.set("sort_order", state.sort_order);
  }
  return next;
}

export function hasDNSRecordFilters(params: DNSRecordListParams): boolean {
  return Boolean(
    params.search ||
      params.record_type ||
      params.routing_policy ||
      params.alias !== undefined,
  );
}
