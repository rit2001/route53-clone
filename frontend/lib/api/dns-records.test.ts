import { apiRequest } from "@/lib/api/client";
import type { DNSRecordListParams } from "@/types/dns-record";

import {
  createDNSRecord,
  deleteDNSRecord,
  getDNSRecord,
  listDNSRecords,
  updateDNSRecord,
} from "./dns-records";

vi.mock("@/lib/api/client", () => ({ apiRequest: vi.fn() }));

const token = "opaque-token";
const params: DNSRecordListParams = {
  search: " api value ",
  record_type: "A",
  routing_policy: "SIMPLE",
  alias: false,
  page: 2,
  page_size: 25,
  sort_by: "ttl",
  sort_order: "desc",
};

describe("DNS records API", () => {
  beforeEach(() => vi.mocked(apiRequest).mockReset());

  it("encodes list filters, booleans, pagination, and sorting", () => {
    void listDNSRecords("Z/ONE", params, token);
    expect(apiRequest).toHaveBeenCalledWith(
      "/hosted-zones/Z%2FONE/records?search=api+value&record_type=A&routing_policy=SIMPLE&alias=false&page=2&page_size=25&sort_by=ttl&sort_order=desc",
      { accessToken: token },
    );
  });

  it("omits empty optional filters", () => {
    void listDNSRecords(
      "ZONE",
      {
        page: 1,
        page_size: 25,
        sort_by: "name",
        sort_order: "asc",
      },
      token,
    );
    const path = vi.mocked(apiRequest).mock.calls[0][0] as string;
    expect(path).not.toContain("search=");
    expect(path).not.toContain("record_type=");
    expect(path).not.toContain("alias=");
  });

  it("encodes an alias true filter", () => {
    void listDNSRecords("ZONE", { ...params, alias: true }, token);
    expect(vi.mocked(apiRequest).mock.calls[0][0]).toContain("alias=true");
  });

  it("sends the exact create contract", () => {
    const input = {
      name: "api",
      record_type: "A" as const,
      values: ["192.0.2.10"],
      ttl: 300,
      routing_policy: "SIMPLE" as const,
      alias: false as const,
    };
    void createDNSRecord("ZONE", input, token);
    expect(apiRequest).toHaveBeenCalledWith("/hosted-zones/ZONE/records", {
      method: "POST",
      accessToken: token,
      body: input,
    });
  });

  it("encodes both IDs for detail", () => {
    void getDNSRecord("Z/ONE", "record/id", token);
    expect(apiRequest).toHaveBeenCalledWith(
      "/hosted-zones/Z%2FONE/records/record%2Fid",
      { accessToken: token },
    );
  });

  it("updates only values and TTL", () => {
    const input = { values: ["192.0.2.20"], ttl: 600 };
    void updateDNSRecord("ZONE", "RECORD", input, token);
    expect(apiRequest).toHaveBeenCalledWith(
      "/hosted-zones/ZONE/records/RECORD",
      {
        method: "PATCH",
        accessToken: token,
        body: input,
      },
    );
  });

  it("delegates 204 deletion handling to the shared client", async () => {
    vi.mocked(apiRequest).mockResolvedValue(undefined);
    await expect(deleteDNSRecord("ZONE", "RECORD", token)).resolves.toBeUndefined();
    expect(apiRequest).toHaveBeenCalledWith(
      "/hosted-zones/ZONE/records/RECORD",
      { method: "DELETE", accessToken: token },
    );
  });

});
