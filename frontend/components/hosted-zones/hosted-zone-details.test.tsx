import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { ApiError } from "@/lib/api/errors";
import type { HostedZoneDetail } from "@/types/hosted-zone";

import { HostedZoneDetails } from "./hosted-zone-details";

const publicZone: HostedZoneDetail = {
  id: "ZPUBLIC",
  name: "example.com.",
  comment: "Public website",
  zone_type: "PUBLIC",
  record_count: 2,
  name_servers: [
    "ns-1.mock.invalid.",
    "ns-2.mock.invalid.",
    "ns-3.mock.invalid.",
    "ns-4.mock.invalid.",
  ],
  created_at: "2026-07-26T10:00:00Z",
  updated_at: "2026-07-26T11:00:00Z",
};

const mocks = vi.hoisted(() => ({
  push: vi.fn(),
  refetch: vi.fn(),
  query: {} as Record<string, unknown>,
  update: {
    mutateAsync: vi.fn(),
    reset: vi.fn(),
    isPending: false,
    error: null as unknown,
  },
  remove: {
    mutateAsync: vi.fn(),
    reset: vi.fn(),
    isPending: false,
    error: null as unknown,
  },
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mocks.push }),
}));

vi.mock("@/hooks/hosted-zones/queries", () => ({
  useHostedZone: () => mocks.query,
  useUpdateHostedZone: () => mocks.update,
  useDeleteHostedZone: () => mocks.remove,
}));

function setDetailQuery(overrides: Record<string, unknown> = {}) {
  mocks.query = {
    data: publicZone,
    error: null,
    isPending: false,
    isError: false,
    refetch: mocks.refetch,
    ...overrides,
  };
}

describe("HostedZoneDetails", () => {
  beforeEach(() => {
    mocks.push.mockReset();
    mocks.refetch.mockReset();
    mocks.update.mutateAsync.mockReset();
    mocks.update.reset.mockReset();
    mocks.update.isPending = false;
    mocks.update.error = null;
    mocks.remove.mutateAsync.mockReset();
    mocks.remove.reset.mockReset();
    mocks.remove.isPending = false;
    mocks.remove.error = null;
    setDetailQuery();
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText: vi.fn().mockResolvedValue(undefined) },
    });
  });

  it("renders a loading state", () => {
    setDetailQuery({ data: undefined, isPending: true });
    render(<HostedZoneDetails zoneId="ZPUBLIC" />);
    expect(screen.getByLabelText("Loading hosted zones")).toBeInTheDocument();
  });

  it("renders public zone details and persisted name servers", () => {
    render(<HostedZoneDetails zoneId="ZPUBLIC" />);
    expect(
      screen.getByRole("heading", { name: "example.com.", level: 1 }),
    ).toBeInTheDocument();
    expect(screen.getByText("Public website")).toBeInTheDocument();
    expect(screen.getByText("ZPUBLIC")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
    publicZone.name_servers.forEach((nameServer) =>
      expect(screen.getByText(nameServer)).toBeInTheDocument(),
    );
  });

  it("renders private zone details without public name servers", () => {
    setDetailQuery({
      data: {
        ...publicZone,
        id: "ZPRIVATE",
        zone_type: "PRIVATE",
        record_count: 0,
        name_servers: [],
      },
    });
    render(<HostedZoneDetails zoneId="ZPRIVATE" />);
    expect(
      screen.getByText(
        "No public name servers are assigned to a private hosted zone.",
      ),
    ).toBeInTheDocument();
    expect(screen.getAllByText("Private")).toHaveLength(2);
  });

  it("renders an em dash for a missing comment", () => {
    setDetailQuery({ data: { ...publicZone, comment: null } });
    render(<HostedZoneDetails zoneId="ZPUBLIC" />);
    expect(screen.getByText("—")).toBeInTheDocument();
  });

  it("renders an ownership-safe not-found state", async () => {
    const user = userEvent.setup();
    setDetailQuery({
      data: undefined,
      isError: true,
      error: new ApiError(
        404,
        "HOSTED_ZONE_NOT_FOUND",
        "Hosted zone not found.",
      ),
    });
    render(<HostedZoneDetails zoneId="ZMISSING" />);
    expect(screen.getByText(/may have been deleted/)).toBeInTheDocument();
    await user.click(
      screen.getByRole("button", { name: "Return to hosted zones" }),
    );
    expect(mocks.push).toHaveBeenCalledWith("/route53/hosted-zones");
  });

  it("renders a retryable detail error", async () => {
    const user = userEvent.setup();
    setDetailQuery({
      data: undefined,
      isError: true,
      error: new ApiError(0, "NETWORK_ERROR", "Offline"),
    });
    render(<HostedZoneDetails zoneId="ZPUBLIC" />);
    await user.click(screen.getByRole("button", { name: "Try again" }));
    expect(mocks.refetch).toHaveBeenCalledOnce();
  });

  it("copies the zone ID, individual name server, and all name servers", async () => {
    const user = userEvent.setup();
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });
    render(<HostedZoneDetails zoneId="ZPUBLIC" />);

    await user.click(
      screen.getByRole("button", { name: "Copy hosted zone ID" }),
    );
    expect(writeText).toHaveBeenCalledWith("ZPUBLIC");
    await user.click(
      screen.getByRole("button", {
        name: "Copy name server ns-1.mock.invalid.",
      }),
    );
    expect(writeText).toHaveBeenCalledWith("ns-1.mock.invalid.");
    await user.click(screen.getByRole("button", { name: "Copy all" }));
    expect(writeText).toHaveBeenCalledWith(publicZone.name_servers.join("\n"));
  });

  it("handles clipboard failure without breaking details", async () => {
    const user = userEvent.setup();
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText: vi.fn().mockRejectedValue(new Error("denied")) },
    });
    render(<HostedZoneDetails zoneId="ZPUBLIC" />);
    await user.click(
      screen.getByRole("button", { name: "Copy hosted zone ID" }),
    );
    expect(screen.getByText("Public website")).toBeInTheDocument();
  });

  it("opens edit with the current comment and updates visible content", async () => {
    const user = userEvent.setup();
    mocks.update.mutateAsync.mockImplementation(async ({ comment }) => {
      mocks.query.data = { ...publicZone, comment };
      return mocks.query.data;
    });
    render(<HostedZoneDetails zoneId="ZPUBLIC" />);
    await user.click(
      screen.getByRole("button", { name: "Edit description" }),
    );
    const field = screen.getByLabelText("Description");
    expect(field).toHaveValue("Public website");
    await user.clear(field);
    await user.type(field, "Updated description");
    await user.click(screen.getByRole("button", { name: "Save changes" }));
    await waitFor(() =>
      expect(mocks.update.mutateAsync).toHaveBeenCalledWith({
        comment: "Updated description",
      }),
    );
    expect(await screen.findByText("Updated description")).toBeInTheDocument();
  });

  it("keeps the edit dialog open after failure", async () => {
    const user = userEvent.setup();
    mocks.update.mutateAsync.mockRejectedValue(new Error("failed"));
    render(<HostedZoneDetails zoneId="ZPUBLIC" />);
    await user.click(
      screen.getByRole("button", { name: "Edit description" }),
    );
    await user.click(screen.getByRole("button", { name: "Save changes" }));
    await waitFor(() => expect(mocks.update.mutateAsync).toHaveBeenCalled());
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("requires the exact canonical name before deletion", async () => {
    const user = userEvent.setup();
    render(<HostedZoneDetails zoneId="ZPUBLIC" />);
    await user.click(
      screen.getByRole("button", { name: "Delete hosted zone" }),
    );
    const confirmation = screen.getByLabelText(/Type example.com. to confirm/);
    const deleteButtons = screen.getAllByRole("button", {
      name: "Delete hosted zone",
    });
    const confirmDelete = deleteButtons.at(-1);
    expect(confirmDelete).toBeDisabled();
    await user.type(confirmation, "example.com");
    expect(confirmDelete).toBeDisabled();
    await user.type(confirmation, ".");
    expect(confirmDelete).toBeEnabled();
  });

  it("deletes and navigates back to the list", async () => {
    const user = userEvent.setup();
    mocks.remove.mutateAsync.mockResolvedValue(undefined);
    render(<HostedZoneDetails zoneId="ZPUBLIC" />);
    await user.click(
      screen.getByRole("button", { name: "Delete hosted zone" }),
    );
    await user.type(
      screen.getByLabelText(/Type example.com. to confirm/),
      "example.com.",
    );
    const deleteButtons = screen.getAllByRole("button", {
      name: "Delete hosted zone",
    });
    await user.click(deleteButtons.at(-1) as HTMLElement);
    await waitFor(() => expect(mocks.remove.mutateAsync).toHaveBeenCalled());
    expect(mocks.push).toHaveBeenCalledWith("/route53/hosted-zones");
  });

  it("keeps delete confirmation recoverable after failure", async () => {
    const user = userEvent.setup();
    mocks.remove.mutateAsync.mockRejectedValue(new Error("failed"));
    render(<HostedZoneDetails zoneId="ZPUBLIC" />);
    await user.click(
      screen.getByRole("button", { name: "Delete hosted zone" }),
    );
    await user.type(
      screen.getByLabelText(/Type example.com. to confirm/),
      "example.com.",
    );
    const deleteButtons = screen.getAllByRole("button", {
      name: "Delete hosted zone",
    });
    await user.click(deleteButtons.at(-1) as HTMLElement);
    await waitFor(() => expect(mocks.remove.mutateAsync).toHaveBeenCalled());
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("links to record management without fabricating a records table", () => {
    render(<HostedZoneDetails zoneId="ZPUBLIC" />);
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Manage records" }),
    ).toHaveAttribute(
      "href",
      "/route53/hosted-zones/ZPUBLIC/records",
    );
  });
});
