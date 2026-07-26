import { ApiError } from "@/lib/api/errors";
import type { HostedZoneDetail } from "@/types/hosted-zone";

import { apiRequest } from "./client";
import {
  createHostedZone,
  deleteHostedZone,
  getHostedZone,
  listHostedZones,
  updateHostedZone,
} from "./hosted-zones";

vi.mock("./client", () => ({ apiRequest: vi.fn() }));

const token = "opaque-token";
const detail: HostedZoneDetail = {
  id: "Z123",
  name: "example.com.",
  comment: null,
  zone_type: "PUBLIC",
  record_count: 2,
  name_servers: ["ns-1.mock.invalid."],
  created_at: "2026-07-26T10:00:00Z",
  updated_at: "2026-07-26T10:00:00Z",
};

describe("Hosted Zones API", () => {
  beforeEach(() => {
    vi.mocked(apiRequest).mockReset();
  });

  it("encodes list query parameters", async () => {
    vi.mocked(apiRequest).mockResolvedValue({
      items: [],
      page: 2,
      page_size: 25,
      total: 0,
      total_pages: 0,
    });

    await listHostedZones(
      {
        search: "api & web",
        zone_type: "PUBLIC",
        page: 2,
        page_size: 25,
        sort_by: "created_at",
        sort_order: "desc",
      },
      token,
    );

    const path = vi.mocked(apiRequest).mock.calls[0]?.[0] ?? "";
    const params = new URLSearchParams(path.split("?")[1]);
    expect(params.get("search")).toBe("api & web");
    expect(params.get("zone_type")).toBe("PUBLIC");
    expect(params.get("page")).toBe("2");
    expect(params.get("page_size")).toBe("25");
    expect(params.get("sort_by")).toBe("created_at");
    expect(params.get("sort_order")).toBe("desc");
  });

  it("omits empty optional list parameters", async () => {
    vi.mocked(apiRequest).mockResolvedValue({
      items: [],
      page: 1,
      page_size: 10,
      total: 0,
      total_pages: 0,
    });

    await listHostedZones(
      {
        search: "  ",
        page: 1,
        page_size: 10,
        sort_by: "name",
        sort_order: "asc",
      },
      token,
    );

    const path = vi.mocked(apiRequest).mock.calls[0]?.[0] ?? "";
    expect(path).not.toContain("search=");
    expect(path).not.toContain("zone_type=");
  });

  it("sends the exact create body and bearer token", async () => {
    vi.mocked(apiRequest).mockResolvedValue(detail);
    const input = {
      name: "example.com",
      comment: "Public zone",
      zone_type: "PUBLIC" as const,
    };

    await createHostedZone(input, token);

    expect(apiRequest).toHaveBeenCalledWith("/hosted-zones", {
      method: "POST",
      accessToken: token,
      body: input,
    });
  });

  it("encodes the detail zone ID", async () => {
    vi.mocked(apiRequest).mockResolvedValue(detail);

    await getHostedZone("Z/unsafe id", token);

    expect(apiRequest).toHaveBeenCalledWith(
      "/hosted-zones/Z%2Funsafe%20id",
      { accessToken: token },
    );
  });

  it("updates only the comment", async () => {
    vi.mocked(apiRequest).mockResolvedValue(detail);

    await updateHostedZone("Z123", { comment: null }, token);

    expect(apiRequest).toHaveBeenCalledWith("/hosted-zones/Z123", {
      method: "PATCH",
      accessToken: token,
      body: { comment: null },
    });
  });

  it("handles bodyless deletion", async () => {
    vi.mocked(apiRequest).mockResolvedValue(undefined);

    await expect(deleteHostedZone("Z123", token)).resolves.toBeUndefined();
    expect(apiRequest).toHaveBeenCalledWith("/hosted-zones/Z123", {
      method: "DELETE",
      accessToken: token,
    });
  });

  it("preserves structured API errors without adding the token", async () => {
    const error = new ApiError(
      409,
      "HOSTED_ZONE_ALREADY_EXISTS",
      "A PUBLIC hosted zone already exists.",
    );
    vi.mocked(apiRequest).mockRejectedValue(error);

    const caught = await createHostedZone(
      { name: "example.com", zone_type: "PUBLIC" },
      token,
    ).catch((value: unknown) => value);

    expect(caught).toBe(error);
    expect(String(caught)).not.toContain(token);
  });
});
