import {
  act,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { ApiError } from "@/lib/api/errors";
import type {
  HostedZoneListParams,
  HostedZoneListResponse,
} from "@/types/hosted-zone";

import { HostedZonesPageContent } from "./hosted-zones-page";

const mocks = vi.hoisted(() => ({
  state: {
    page: 1,
    page_size: 10,
    sort_by: "name",
    sort_order: "asc",
  } as HostedZoneListParams,
  updateState: vi.fn(),
  refetch: vi.fn(),
  query: {} as Record<string, unknown>,
  deleteMutation: {
    isPending: false,
    error: null,
    reset: vi.fn(),
    mutateAsync: vi.fn(),
  },
}));

vi.mock("@/hooks/hosted-zones/use-hosted-zone-list-state", () => ({
  useHostedZoneListState: () => ({
    state: mocks.state,
    updateState: mocks.updateState,
  }),
}));

vi.mock("@/hooks/hosted-zones/queries", () => ({
  useHostedZones: () => mocks.query,
  useDeleteHostedZone: () => mocks.deleteMutation,
}));

const zones: HostedZoneListResponse = {
  items: [
    {
      id: "ZPUBLIC",
      name: "example.com.",
      comment: "Public website",
      zone_type: "PUBLIC",
      record_count: 2,
      created_at: "2026-07-26T10:00:00Z",
      updated_at: "2026-07-26T11:00:00Z",
    },
    {
      id: "ZPRIVATE",
      name: "internal.example.com.",
      comment: null,
      zone_type: "PRIVATE",
      record_count: 0,
      created_at: "2026-07-25T10:00:00Z",
      updated_at: "2026-07-25T10:00:00Z",
    },
  ],
  page: 1,
  page_size: 10,
  total: 2,
  total_pages: 1,
};

function setQuery(overrides: Record<string, unknown> = {}) {
  mocks.query = {
    data: zones,
    error: null,
    isPending: false,
    isError: false,
    isFetching: false,
    refetch: mocks.refetch,
    ...overrides,
  };
}

describe("HostedZonesPageContent", () => {
  beforeEach(() => {
    mocks.state = {
      page: 1,
      page_size: 10,
      sort_by: "name",
      sort_order: "asc",
    };
    mocks.updateState.mockReset();
    mocks.refetch.mockReset();
    mocks.refetch.mockResolvedValue({ isError: false });
    mocks.deleteMutation.mutateAsync.mockReset();
    mocks.deleteMutation.reset.mockReset();
    mocks.deleteMutation.error = null;
    mocks.deleteMutation.isPending = false;
    setQuery();
  });

  it("renders a loading table skeleton", () => {
    setQuery({ data: undefined, isPending: true });
    render(<HostedZonesPageContent />);
    expect(screen.getByLabelText("Loading hosted zones")).toBeInTheDocument();
  });

  it("renders the first-use empty-state CTA", () => {
    setQuery({ data: { ...zones, items: [], total: 0, total_pages: 0 } });
    render(<HostedZonesPageContent />);
    expect(screen.getByText("No hosted zones")).toBeInTheDocument();
    expect(
      screen.getAllByRole("link", { name: "Create hosted zone" }),
    ).toHaveLength(2);
  });

  it("renders the filtered empty state", () => {
    mocks.state = { ...mocks.state, search: "missing" };
    setQuery({ data: { ...zones, items: [], total: 0, total_pages: 0 } });
    render(<HostedZonesPageContent />);
    expect(
      screen.getByText("No hosted zones match the current filters."),
    ).toBeInTheDocument();
  });

  it("renders API errors with retry", async () => {
    const user = userEvent.setup();
    setQuery({
      data: undefined,
      isError: true,
      error: new ApiError(0, "NETWORK_ERROR", "Offline"),
    });
    render(<HostedZonesPageContent />);
    expect(
      screen.getByText(/Check the backend connection/),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Try again" }));
    expect(mocks.refetch).toHaveBeenCalledOnce();
  });

  it("renders real-shaped rows, links, badges, counts, and missing comments", () => {
    render(<HostedZonesPageContent />);
    expect(
      screen.getByRole("link", { name: "example.com." }),
    ).toHaveAttribute("href", "/route53/hosted-zones/ZPUBLIC");
    expect(screen.getAllByText("Public")).toHaveLength(2);
    expect(screen.getAllByText("Private")).toHaveLength(2);
    expect(screen.getByText("Public website")).toBeInTheDocument();
    expect(screen.getByText("—")).toBeInTheDocument();
    expect(screen.getAllByText("2").length).toBeGreaterThan(0);
  });

  it("debounces search updates and trims the value", () => {
    vi.useFakeTimers();
    render(<HostedZonesPageContent />);
    fireEvent.change(screen.getByLabelText("Search hosted zones"), {
      target: { value: "  example  " },
    });

    act(() => vi.advanceTimersByTime(299));
    expect(mocks.updateState).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(1));
    expect(mocks.updateState).toHaveBeenCalledWith({ search: "example" });
    vi.useRealTimers();
  });

  it("clears search immediately", async () => {
    const user = userEvent.setup();
    mocks.state = { ...mocks.state, search: "example" };
    render(<HostedZonesPageContent />);
    await user.click(
      screen.getByRole("button", { name: "Clear hosted zone search" }),
    );
    expect(mocks.updateState).toHaveBeenCalledWith({ search: undefined });
  });

  it("updates the type filter and clears all filters", async () => {
    const user = userEvent.setup();
    mocks.state = { ...mocks.state, search: "api", zone_type: "PUBLIC" };
    render(<HostedZonesPageContent />);

    await user.selectOptions(screen.getByLabelText("Filter by zone type"), "PRIVATE");
    expect(mocks.updateState).toHaveBeenCalledWith({ zone_type: "PRIVATE" });
    await user.click(screen.getByRole("button", { name: "Clear filters" }));
    expect(mocks.updateState).toHaveBeenCalledWith({
      search: undefined,
      zone_type: undefined,
    });
  });

  it("toggles backend sorting with aria-sort", async () => {
    const user = userEvent.setup();
    render(<HostedZonesPageContent />);
    const heading = screen.getByRole("columnheader", {
      name: /Hosted zone name/,
    });
    expect(heading).toHaveAttribute("aria-sort", "ascending");

    await user.click(
      screen.getByRole("button", { name: /Hosted zone name/ }),
    );
    expect(mocks.updateState).toHaveBeenCalledWith({
      sort_by: "name",
      sort_order: "desc",
    });
  });

  it("drives page and page size through URL state", async () => {
    const user = userEvent.setup();
    setQuery({ data: { ...zones, total: 20, total_pages: 2 } });
    render(<HostedZonesPageContent />);

    await user.click(screen.getByRole("button", { name: "Next page" }));
    expect(mocks.updateState).toHaveBeenCalledWith({ page: 2 });
    await user.selectOptions(screen.getByLabelText("Rows per page"), "25");
    expect(mocks.updateState).toHaveBeenCalledWith({ page_size: 25 });
  });

  it("refreshes without changing list state", async () => {
    const user = userEvent.setup();
    render(<HostedZonesPageContent />);
    await user.click(screen.getByRole("button", { name: "Refresh" }));
    expect(mocks.refetch).toHaveBeenCalledOnce();
    expect(mocks.updateState).not.toHaveBeenCalled();
  });

  it("selects rows and enables single-zone deletion", async () => {
    const user = userEvent.setup();
    render(<HostedZonesPageContent />);
    const deleteButton = screen.getByRole("button", { name: "Delete" });
    expect(deleteButton).toBeDisabled();

    await user.click(
      screen.getByRole("checkbox", { name: "Select hosted zone example.com." }),
    );
    expect(deleteButton).toBeEnabled();
    await user.click(deleteButton);
    expect(screen.getByRole("dialog")).toHaveTextContent("example.com.");
  });

  it("selects the visible page and explains unsupported bulk deletion", async () => {
    const user = userEvent.setup();
    render(<HostedZonesPageContent />);
    await user.click(
      screen.getByRole("checkbox", {
        name: "Select all hosted zones on this page",
      }),
    );
    expect(screen.getByText("Bulk deletion is not available.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Delete" })).toBeDisabled();
  });

  it("clears effective selection when list state changes", async () => {
    const user = userEvent.setup();
    const view = render(<HostedZonesPageContent />);
    await user.click(
      screen.getByRole("checkbox", { name: "Select hosted zone example.com." }),
    );
    expect(screen.getByRole("button", { name: "Delete" })).toBeEnabled();

    mocks.state = { ...mocks.state, page: 2 };
    view.rerender(<HostedZonesPageContent />);
    expect(screen.getByRole("button", { name: "Delete" })).toBeDisabled();
  });

  it("retains rows and shows refresh status during background fetching", () => {
    setQuery({ isFetching: true });
    render(<HostedZonesPageContent />);
    expect(screen.getByText("example.com.")).toBeInTheDocument();
    expect(screen.getByLabelText("Refreshing hosted zones")).toBeInTheDocument();
  });

  it("keeps the wide table in an accessible scroll region", () => {
    render(<HostedZonesPageContent />);
    expect(
      screen.getByRole("region", { name: "Hosted zones table" }),
    ).toHaveAttribute("tabindex", "0");
  });
});
