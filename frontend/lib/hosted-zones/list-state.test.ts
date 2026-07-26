import {
  DEFAULT_HOSTED_ZONE_LIST_STATE,
  parseHostedZoneListState,
  updateHostedZoneListSearchParams,
} from "./list-state";

describe("Hosted Zone URL state", () => {
  it("parses defaults", () => {
    expect(parseHostedZoneListState(new URLSearchParams())).toEqual(
      DEFAULT_HOSTED_ZONE_LIST_STATE,
    );
  });

  it("parses trimmed search and valid state", () => {
    const result = parseHostedZoneListState(
      new URLSearchParams(
        "search=%20example%20&zone_type=PUBLIC&page=3&page_size=25&sort_by=updated_at&sort_order=desc",
      ),
    );
    expect(result).toEqual({
      search: "example",
      zone_type: "PUBLIC",
      page: 3,
      page_size: 25,
      sort_by: "updated_at",
      sort_order: "desc",
    });
  });

  it.each(["0", "-1", "abc", "1.5"])(
    "falls back for invalid page %s",
    (page) => {
      expect(
        parseHostedZoneListState(new URLSearchParams({ page })).page,
      ).toBe(1);
    },
  );

  it("falls back for an unsupported page size", () => {
    expect(
      parseHostedZoneListState(
        new URLSearchParams({ page_size: "15" }),
      ).page_size,
    ).toBe(10);
  });

  it("ignores an invalid zone type", () => {
    expect(
      parseHostedZoneListState(
        new URLSearchParams({ zone_type: "INTERNAL" }),
      ).zone_type,
    ).toBeUndefined();
  });

  it("falls back for an invalid sort field", () => {
    expect(
      parseHostedZoneListState(
        new URLSearchParams({ sort_by: "comment" }),
      ).sort_by,
    ).toBe("name");
  });

  it("falls back for an invalid sort order", () => {
    expect(
      parseHostedZoneListState(
        new URLSearchParams({ sort_order: "sideways" }),
      ).sort_order,
    ).toBe("asc");
  });

  it.each([
    [{ search: "api" }, "search=api"],
    [{ zone_type: "PRIVATE" as const }, "zone_type=PRIVATE"],
    [{ page_size: 50 }, "page_size=50"],
    [{ sort_by: "created_at" as const }, "sort_by=created_at"],
  ])("resets page when operational state changes", (patch, expected) => {
    const result = updateHostedZoneListSearchParams(
      new URLSearchParams("page=4"),
      patch,
    );
    expect(result.get("page")).toBeNull();
    expect(result.toString()).toContain(expected);
  });

  it("keeps an explicit page change", () => {
    const result = updateHostedZoneListSearchParams(
      new URLSearchParams(),
      { page: 3 },
    );
    expect(result.get("page")).toBe("3");
  });

  it("clears filters and removes default parameters", () => {
    const result = updateHostedZoneListSearchParams(
      new URLSearchParams(
        "search=api&zone_type=PUBLIC&page=2&page_size=25&sort_by=created_at&sort_order=desc",
      ),
      {
        search: undefined,
        zone_type: undefined,
        page_size: 10,
        sort_by: "name",
        sort_order: "asc",
      },
    );
    expect(result.toString()).toBe("");
  });

  it("preserves unrelated parameters deliberately", () => {
    const result = updateHostedZoneListSearchParams(
      new URLSearchParams("view=compact&page=2"),
      { search: "api" },
    );
    expect(result.get("view")).toBe("compact");
    expect(result.get("search")).toBe("api");
  });
});
