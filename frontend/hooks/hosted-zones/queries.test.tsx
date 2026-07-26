import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";

import {
  createHostedZone,
  deleteHostedZone,
  getHostedZone,
  listHostedZones,
  updateHostedZone,
} from "@/lib/api/hosted-zones";
import { ApiError } from "@/lib/api/errors";
import type {
  HostedZoneDetail,
  HostedZoneListParams,
} from "@/types/hosted-zone";

import {
  hostedZoneKeys,
  useCreateHostedZone,
  useDeleteHostedZone,
  useHostedZone,
  useHostedZones,
  useUpdateHostedZone,
} from "./queries";

vi.mock("@/components/auth/auth-provider", () => ({
  useAuth: () => ({
    accessToken: "opaque-token",
    status: "authenticated",
    user: {},
  }),
}));

vi.mock("@/lib/api/hosted-zones", () => ({
  listHostedZones: vi.fn(),
  createHostedZone: vi.fn(),
  getHostedZone: vi.fn(),
  updateHostedZone: vi.fn(),
  deleteHostedZone: vi.fn(),
}));

const zone: HostedZoneDetail = {
  id: "Z123",
  name: "example.com.",
  comment: null,
  zone_type: "PUBLIC",
  record_count: 2,
  name_servers: [],
  created_at: "2026-07-26T10:00:00Z",
  updated_at: "2026-07-26T10:00:00Z",
};
const params: HostedZoneListParams = {
  search: "example",
  page: 1,
  page_size: 10,
  sort_by: "name",
  sort_order: "asc",
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

describe("Hosted Zone query hooks", () => {
  beforeEach(() => {
    vi.mocked(listHostedZones).mockReset();
    vi.mocked(createHostedZone).mockReset();
    vi.mocked(getHostedZone).mockReset();
    vi.mocked(updateHostedZone).mockReset();
    vi.mocked(deleteHostedZone).mockReset();
  });

  it("uses list parameters in the stable query key", async () => {
    vi.mocked(listHostedZones).mockResolvedValue({
      items: [],
      page: 1,
      page_size: 10,
      total: 0,
      total_pages: 0,
    });
    const { queryClient, wrapper } = setup();
    const { result } = renderHook(() => useHostedZones(params), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(listHostedZones).toHaveBeenCalledWith(params, "opaque-token");
    expect(
      queryClient.getQueryData(hostedZoneKeys.list(params)),
    ).toBeDefined();
  });

  it("seeds detail and invalidates lists after creation", async () => {
    vi.mocked(createHostedZone).mockResolvedValue(zone);
    const { queryClient, wrapper } = setup();
    const invalidate = vi.spyOn(queryClient, "invalidateQueries");
    const { result } = renderHook(() => useCreateHostedZone(), { wrapper });

    await act(() =>
      result.current.mutateAsync({
        name: "example.com",
        zone_type: "PUBLIC",
      }),
    );

    expect(queryClient.getQueryData(hostedZoneKeys.detail(zone.id))).toEqual(
      zone,
    );
    expect(invalidate).toHaveBeenCalledWith({
      queryKey: hostedZoneKeys.all,
    });
  });

  it("updates detail and invalidates lists after comment changes", async () => {
    const updated = { ...zone, comment: "Updated" };
    vi.mocked(updateHostedZone).mockResolvedValue(updated);
    const { queryClient, wrapper } = setup();
    const invalidate = vi.spyOn(queryClient, "invalidateQueries");
    const { result } = renderHook(() => useUpdateHostedZone(zone.id), {
      wrapper,
    });

    await act(() => result.current.mutateAsync({ comment: "Updated" }));

    expect(queryClient.getQueryData(hostedZoneKeys.detail(zone.id))).toEqual(
      updated,
    );
    expect(invalidate).toHaveBeenCalledWith({
      queryKey: hostedZoneKeys.all,
    });
  });

  it("removes detail and invalidates lists after deletion", async () => {
    vi.mocked(deleteHostedZone).mockResolvedValue(undefined);
    const { queryClient, wrapper } = setup();
    queryClient.setQueryData(hostedZoneKeys.detail(zone.id), zone);
    const invalidate = vi.spyOn(queryClient, "invalidateQueries");
    const { result } = renderHook(() => useDeleteHostedZone(zone.id), {
      wrapper,
    });

    await act(() => result.current.mutateAsync());

    expect(queryClient.getQueryData(hostedZoneKeys.detail(zone.id))).toBeUndefined();
    expect(invalidate).toHaveBeenCalledWith({
      queryKey: hostedZoneKeys.all,
    });
  });

  it("does not retry a 404 detail request", async () => {
    vi.mocked(getHostedZone).mockRejectedValue(
      new ApiError(404, "HOSTED_ZONE_NOT_FOUND", "Not found"),
    );
    const { wrapper } = setup();
    const { result } = renderHook(() => useHostedZone("ZMISSING"), {
      wrapper,
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(getHostedZone).toHaveBeenCalledOnce();
  });

  it("does not retry unsafe mutations", async () => {
    vi.mocked(createHostedZone).mockRejectedValue(new Error("server failure"));
    const { wrapper } = setup();
    const { result } = renderHook(() => useCreateHostedZone(), { wrapper });

    await expect(
      act(() =>
        result.current.mutateAsync({
          name: "example.com",
          zone_type: "PUBLIC",
        }),
      ),
    ).rejects.toThrow("server failure");
    expect(createHostedZone).toHaveBeenCalledOnce();
  });
});
