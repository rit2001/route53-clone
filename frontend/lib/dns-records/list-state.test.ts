import {
  DEFAULT_DNS_RECORD_LIST_STATE,
  hasDNSRecordFilters,
  parseDNSRecordListState,
  updateDNSRecordListSearchParams,
} from "./list-state";

describe("DNS record list URL state", () => {
  it("uses documented defaults", () => {
    expect(parseDNSRecordListState(new URLSearchParams())).toEqual(
      DEFAULT_DNS_RECORD_LIST_STATE,
    );
  });

  it("parses search, type, policy, alias, pagination, and sorting", () => {
    const state = parseDNSRecordListState(
      new URLSearchParams(
        "search=api&record_type=AAAA&routing_policy=SIMPLE&alias=false&page=3&page_size=50&sort_by=updated_at&sort_order=desc",
      ),
    );
    expect(state).toEqual({
      search: "api",
      record_type: "AAAA",
      routing_policy: "SIMPLE",
      alias: false,
      page: 3,
      page_size: 50,
      sort_by: "updated_at",
      sort_order: "desc",
    });
  });

  it.each(["true", "false"])("parses alias=%s", (value) => {
    expect(
      parseDNSRecordListState(new URLSearchParams(`alias=${value}`)).alias,
    ).toBe(value === "true");
  });

  it("falls back safely for invalid values", () => {
    expect(
      parseDNSRecordListState(
        new URLSearchParams(
          "record_type=BAD&routing_policy=WEIGHTED&alias=maybe&page=0&page_size=13&sort_by=value&sort_order=sideways",
        ),
      ),
    ).toEqual(DEFAULT_DNS_RECORD_LIST_STATE);
  });

  it.each([
    ["search", { search: "api" }],
    ["record type", { record_type: "A" as const }],
    ["page size", { page_size: 50 }],
    ["sorting", { sort_by: "ttl" as const, sort_order: "desc" as const }],
  ])("resets page when %s changes", (_, patch) => {
    const next = updateDNSRecordListSearchParams(
      new URLSearchParams("page=4"),
      patch,
    );
    expect(next.get("page")).toBeNull();
  });

  it("clears all record filters while preserving unrelated parameters", () => {
    const next = updateDNSRecordListSearchParams(
      new URLSearchParams(
        "search=api&record_type=A&routing_policy=SIMPLE&alias=false&safe=context",
      ),
      {
        search: undefined,
        record_type: undefined,
        routing_policy: undefined,
        alias: undefined,
      },
    );
    expect(next.toString()).toBe("safe=context");
  });

  it("recognises alias=false as an active filter", () => {
    expect(
      hasDNSRecordFilters({
        ...DEFAULT_DNS_RECORD_LIST_STATE,
        alias: false,
      }),
    ).toBe(true);
  });
});
