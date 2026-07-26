import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";

import { hostedZoneKeys } from "@/hooks/hosted-zones/queries";
import {
  createDNSRecord,
  deleteDNSRecord,
  listDNSRecords,
  updateDNSRecord,
} from "@/lib/api/dns-records";
import type { DNSRecord, DNSRecordListParams } from "@/types/dns-record";

import {
  dnsRecordKeys,
  useCreateDNSRecord,
  useDeleteDNSRecord,
  useDNSRecords,
  useUpdateDNSRecord,
} from "./queries";

vi.mock("@/components/auth/auth-provider", () => ({
  useAuth: () => ({ accessToken: "opaque-token", status: "authenticated" }),
}));

vi.mock("@/lib/api/dns-records", () => ({
  listDNSRecords: vi.fn(),
  createDNSRecord: vi.fn(),
  getDNSRecord: vi.fn(),
  updateDNSRecord: vi.fn(),
  deleteDNSRecord: vi.fn(),
}));

const params: DNSRecordListParams = {
  page: 1,
  page_size: 25,
  sort_by: "name",
  sort_order: "asc",
};
const record: DNSRecord = {
  id: "RECORD",
  name: "api.example.com.",
  record_type: "A",
  values: ["192.0.2.10"],
  ttl: 300,
  routing_policy: "SIMPLE",
  alias: false,
  is_system: false,
  created_at: "2026-07-26T10:00:00Z",
  updated_at: "2026-07-26T10:00:00Z",
};

function setup() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return { queryClient, wrapper };
}

describe("DNS record query hooks", () => {
  beforeEach(() => {
    vi.mocked(listDNSRecords).mockReset();
    vi.mocked(createDNSRecord).mockReset();
    vi.mocked(updateDNSRecord).mockReset();
    vi.mocked(deleteDNSRecord).mockReset();
  });

  it("keys and fetches the list by zone and URL parameters", async () => {
    vi.mocked(listDNSRecords).mockResolvedValue({
      items: [],
      page: 1,
      page_size: 25,
      total: 0,
      total_pages: 0,
    });
    const { queryClient, wrapper } = setup();
    const { result } = renderHook(() => useDNSRecords("ZONE", params), {
      wrapper,
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(listDNSRecords).toHaveBeenCalledWith(
      "ZONE",
      params,
      "opaque-token",
    );
    expect(
      queryClient.getQueryData(dnsRecordKeys.list("ZONE", params)),
    ).toBeDefined();
  });

  it("seeds detail and invalidates record and zone counts after create", async () => {
    vi.mocked(createDNSRecord).mockResolvedValue(record);
    const { queryClient, wrapper } = setup();
    const invalidate = vi.spyOn(queryClient, "invalidateQueries");
    const { result } = renderHook(() => useCreateDNSRecord("ZONE"), {
      wrapper,
    });
    await act(() =>
      result.current.mutateAsync({
        name: "api",
        record_type: "A",
        values: ["192.0.2.10"],
        ttl: 300,
        routing_policy: "SIMPLE",
        alias: false,
      }),
    );
    expect(
      queryClient.getQueryData(dnsRecordKeys.detail("ZONE", record.id)),
    ).toEqual(record);
    expect(invalidate).toHaveBeenCalledWith({
      queryKey: hostedZoneKeys.detail("ZONE"),
    });
    expect(invalidate).toHaveBeenCalledWith({
      queryKey: hostedZoneKeys.all,
    });
  });

  it("updates record data without invalidating the unchanged zone count", async () => {
    const updated = { ...record, ttl: 600 };
    vi.mocked(updateDNSRecord).mockResolvedValue(updated);
    const { queryClient, wrapper } = setup();
    const invalidate = vi.spyOn(queryClient, "invalidateQueries");
    const { result } = renderHook(
      () => useUpdateDNSRecord("ZONE", "RECORD"),
      { wrapper },
    );
    await act(() =>
      result.current.mutateAsync({
        values: ["192.0.2.10"],
        ttl: 600,
      }),
    );
    expect(
      queryClient.getQueryData(dnsRecordKeys.detail("ZONE", "RECORD")),
    ).toEqual(updated);
    expect(invalidate).not.toHaveBeenCalledWith({
      queryKey: hostedZoneKeys.detail("ZONE"),
    });
  });

  it("removes detail and invalidates record lists and zone counts after delete", async () => {
    vi.mocked(deleteDNSRecord).mockResolvedValue(undefined);
    const { queryClient, wrapper } = setup();
    queryClient.setQueryData(
      dnsRecordKeys.detail("ZONE", "RECORD"),
      record,
    );
    const invalidate = vi.spyOn(queryClient, "invalidateQueries");
    const { result } = renderHook(
      () => useDeleteDNSRecord("ZONE", "RECORD"),
      { wrapper },
    );
    await act(() => result.current.mutateAsync());
    expect(
      queryClient.getQueryData(dnsRecordKeys.detail("ZONE", "RECORD")),
    ).toBeUndefined();
    expect(invalidate).toHaveBeenCalledWith({
      queryKey: hostedZoneKeys.detail("ZONE"),
    });
  });

  it("never retries an unsafe create mutation", async () => {
    vi.mocked(createDNSRecord).mockRejectedValue(new Error("server failure"));
    const { wrapper } = setup();
    const { result } = renderHook(() => useCreateDNSRecord("ZONE"), {
      wrapper,
    });
    await expect(
      act(() =>
        result.current.mutateAsync({
          name: "api",
          record_type: "A",
          values: ["192.0.2.10"],
          ttl: 300,
          routing_policy: "SIMPLE",
          alias: false,
        }),
      ),
    ).rejects.toThrow("server failure");
    expect(createDNSRecord).toHaveBeenCalledOnce();
  });
});
