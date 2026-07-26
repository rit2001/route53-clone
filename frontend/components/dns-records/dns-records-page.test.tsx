import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { ApiError } from "@/lib/api/errors";
import type {
  DNSRecordListParams,
  DNSRecordListResponse,
} from "@/types/dns-record";

import { DNSRecordsPage } from "./dns-records-page";

const mocks = vi.hoisted(() => ({
  state: {
    page: 1,
    page_size: 25,
    sort_by: "name",
    sort_order: "asc",
  } as DNSRecordListParams,
  updateState: vi.fn(),
  recordsQuery: {} as Record<string, unknown>,
  zoneQuery: {} as Record<string, unknown>,
  recordsRefetch: vi.fn(),
  zoneRefetch: vi.fn(),
  deleteMutation: {
    isPending: false,
    error: null,
    reset: vi.fn(),
    mutateAsync: vi.fn(),
  },
}));

vi.mock("@/hooks/dns-records/use-dns-record-list-state", () => ({
  useDNSRecordListState: () => ({
    state: mocks.state,
    updateState: mocks.updateState,
  }),
}));

vi.mock("@/hooks/dns-records/queries", () => ({
  useDNSRecords: () => mocks.recordsQuery,
  useCreateDNSRecord: () => ({
    isPending: false,
    error: null,
    mutateAsync: vi.fn(),
  }),
  useUpdateDNSRecord: () => ({
    isPending: false,
    error: null,
    mutateAsync: vi.fn(),
  }),
  useDeleteDNSRecord: () => mocks.deleteMutation,
}));

vi.mock("@/hooks/hosted-zones/queries", () => ({
  useHostedZone: () => mocks.zoneQuery,
}));

const zone = {
  id: "ZPUBLIC",
  name: "example.com.",
  comment: "Public website",
  zone_type: "PUBLIC" as const,
  record_count: 3,
  name_servers: ["ns-1.mock.invalid."],
  created_at: "2026-07-26T10:00:00Z",
  updated_at: "2026-07-26T11:00:00Z",
};

const records: DNSRecordListResponse = {
  items: [
    {
      id: "NS",
      name: "example.com.",
      record_type: "NS",
      values: ["ns-1.mock.invalid.", "ns-2.mock.invalid."],
      ttl: 172800,
      routing_policy: "SIMPLE",
      alias: false,
      is_system: true,
      created_at: "2026-07-26T10:00:00Z",
      updated_at: "2026-07-26T10:00:00Z",
    },
    {
      id: "SOA",
      name: "example.com.",
      record_type: "SOA",
      values: ["ns-1.mock.invalid. hostmaster.mock.invalid. 1 7200 900 1209600 86400"],
      ttl: 900,
      routing_policy: "SIMPLE",
      alias: false,
      is_system: true,
      created_at: "2026-07-26T10:00:00Z",
      updated_at: "2026-07-26T10:00:00Z",
    },
    {
      id: "A",
      name: "api.example.com.",
      record_type: "A",
      values: ["192.0.2.10", "192.0.2.11"],
      ttl: 300,
      routing_policy: "SIMPLE",
      alias: false,
      is_system: false,
      created_at: "2026-07-26T10:00:00Z",
      updated_at: "2026-07-26T10:00:00Z",
    },
  ],
  page: 1,
  page_size: 25,
  total: 3,
  total_pages: 1,
};

function setQueries(overrides: Record<string, unknown> = {}) {
  mocks.zoneQuery = {
    data: zone,
    isPending: false,
    isError: false,
    error: null,
    refetch: mocks.zoneRefetch,
  };
  mocks.recordsQuery = {
    data: records,
    isPending: false,
    isError: false,
    isFetching: false,
    error: null,
    refetch: mocks.recordsRefetch,
    ...overrides,
  };
}

describe("DNSRecordsPage", () => {
  beforeEach(() => {
    mocks.state = {
      page: 1,
      page_size: 25,
      sort_by: "name",
      sort_order: "asc",
    };
    mocks.updateState.mockReset();
    mocks.recordsRefetch.mockReset();
    mocks.recordsRefetch.mockResolvedValue({ isError: false });
    mocks.zoneRefetch.mockReset();
    mocks.zoneRefetch.mockResolvedValue({ isError: false });
    mocks.deleteMutation.mutateAsync.mockReset();
    mocks.deleteMutation.reset.mockReset();
    setQueries();
  });

  it("renders loading without replacing the shell", () => {
    mocks.zoneQuery = { isPending: true, isError: false };
    mocks.recordsQuery = { isPending: true };
    render(<DNSRecordsPage zoneId="ZPUBLIC" />);
    expect(screen.getByLabelText("Loading DNS records")).toBeInTheDocument();
  });

  it("renders zone context, system records, user records, and values per line", () => {
    render(<DNSRecordsPage zoneId="ZPUBLIC" />);
    expect(screen.getByText("Records for example.com.")).toBeInTheDocument();
    expect(screen.getByText(/Hosted zone ID:/)).toHaveTextContent("ZPUBLIC");
    expect(screen.getAllByText("System")).toHaveLength(2);
    expect(screen.getByText("192.0.2.10")).toBeInTheDocument();
    expect(screen.getByText("192.0.2.11")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /Hosted zone details/ }),
    ).toHaveAttribute("href", "/route53/hosted-zones/ZPUBLIC");
  });

  it("prevents selecting or editing system records", () => {
    render(<DNSRecordsPage zoneId="ZPUBLIC" />);
    expect(
      screen.getByRole("checkbox", {
        name: "Select NS record example.com.",
      }),
    ).toBeDisabled();
    expect(
      screen.queryByRole("button", {
        name: "Edit NS record example.com.",
      }),
    ).not.toBeInTheDocument();
    expect(screen.getAllByText("System managed")).toHaveLength(2);
  });

  it("debounces backend search and updates filters", async () => {
    vi.useFakeTimers();
    render(<DNSRecordsPage zoneId="ZPUBLIC" />);
    fireEvent.change(screen.getByLabelText("Filter records by name or value"), {
      target: { value: "  api  " },
    });
    act(() => vi.advanceTimersByTime(300));
    expect(mocks.updateState).toHaveBeenCalledWith({ search: "api" });
    vi.useRealTimers();

    const user = userEvent.setup();
    await user.selectOptions(screen.getByLabelText("Filter by record type"), "A");
    await user.selectOptions(
      screen.getByLabelText("Filter by routing policy"),
      "SIMPLE",
    );
    await user.selectOptions(
      screen.getByLabelText("Filter by alias status"),
      "false",
    );
    expect(mocks.updateState).toHaveBeenCalledWith({ record_type: "A" });
    expect(mocks.updateState).toHaveBeenCalledWith({
      routing_policy: "SIMPLE",
    });
    expect(mocks.updateState).toHaveBeenCalledWith({ alias: false });
  });

  it("clears every active filter", async () => {
    const user = userEvent.setup();
    mocks.state = {
      ...mocks.state,
      search: "api",
      record_type: "A",
      routing_policy: "SIMPLE",
      alias: false,
    };
    render(<DNSRecordsPage zoneId="ZPUBLIC" />);
    await user.click(screen.getByRole("button", { name: "Clear filters" }));
    expect(mocks.updateState).toHaveBeenCalledWith({
      search: undefined,
      record_type: undefined,
      routing_policy: undefined,
      alias: undefined,
    });
  });

  it("uses backend sorting with aria-sort", async () => {
    const user = userEvent.setup();
    render(<DNSRecordsPage zoneId="ZPUBLIC" />);
    const header = screen.getByRole("columnheader", { name: /Record name/ });
    expect(header).toHaveAttribute("aria-sort", "ascending");
    await user.click(screen.getByRole("button", { name: /TTL/ }));
    expect(mocks.updateState).toHaveBeenCalledWith({
      sort_by: "ttl",
      sort_order: "asc",
    });
  });

  it("drives pagination and refresh without clearing state", async () => {
    const user = userEvent.setup();
    setQueries({ data: { ...records, total: 30, total_pages: 2 } });
    render(<DNSRecordsPage zoneId="ZPUBLIC" />);
    await user.click(screen.getByRole("button", { name: "Next page" }));
    expect(mocks.updateState).toHaveBeenCalledWith({ page: 2 });
    await user.selectOptions(screen.getByLabelText("Rows per page"), "50");
    expect(mocks.updateState).toHaveBeenCalledWith({ page_size: 50 });
    mocks.updateState.mockClear();
    await user.click(screen.getByRole("button", { name: "Refresh" }));
    expect(mocks.recordsRefetch).toHaveBeenCalledOnce();
    expect(mocks.zoneRefetch).toHaveBeenCalledOnce();
    expect(mocks.updateState).not.toHaveBeenCalled();
  });

  it("renders first-use and filtered empty states", () => {
    setQueries({
      data: { ...records, items: [], total: 0, total_pages: 0 },
    });
    const view = render(<DNSRecordsPage zoneId="ZPUBLIC" />);
    expect(screen.getByText("No DNS records")).toBeInTheDocument();

    mocks.state = { ...mocks.state, record_type: "CAA" };
    view.rerender(<DNSRecordsPage zoneId="ZPUBLIC" />);
    expect(
      screen.getByText("No DNS records match the current filters."),
    ).toBeInTheDocument();
  });

  it("renders API errors with retry", async () => {
    const user = userEvent.setup();
    setQueries({
      data: undefined,
      isError: true,
      error: new ApiError(0, "NETWORK_ERROR", "Offline"),
    });
    render(<DNSRecordsPage zoneId="ZPUBLIC" />);
    expect(screen.getByText(/Check the API connection/)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Try again" }));
    expect(mocks.recordsRefetch).toHaveBeenCalledOnce();
  });

  it("selects a user record and opens delete confirmation", async () => {
    const user = userEvent.setup();
    render(<DNSRecordsPage zoneId="ZPUBLIC" />);
    const deleteButton = screen.getByRole("button", { name: "Delete record" });
    expect(deleteButton).toBeDisabled();
    await user.click(
      screen.getByRole("checkbox", {
        name: "Select A record api.example.com.",
      }),
    );
    expect(deleteButton).toBeEnabled();
    await user.click(deleteButton);
    expect(screen.getByRole("dialog")).toHaveTextContent(
      "Delete A record?",
    );
  });

  it("retains rows during background refresh", () => {
    setQueries({ isFetching: true });
    render(<DNSRecordsPage zoneId="ZPUBLIC" />);
    expect(screen.getByText("api.example.com.")).toBeInTheDocument();
    expect(screen.getByLabelText("Refreshing DNS records")).toBeInTheDocument();
  });

  it("opens the create and edit record dialogs", async () => {
    const user = userEvent.setup();
    render(<DNSRecordsPage zoneId="ZPUBLIC" />);
    await user.click(screen.getByRole("button", { name: "Create record" }));
    expect(screen.getByRole("dialog")).toHaveTextContent("Create record");

    await user.click(screen.getByRole("button", { name: "Close dialog" }));
    await user.click(
      screen.getByRole("button", {
        name: "Edit A record api.example.com.",
      }),
    );
    expect(screen.getByRole("dialog")).toHaveTextContent("Edit record");
  });
});
