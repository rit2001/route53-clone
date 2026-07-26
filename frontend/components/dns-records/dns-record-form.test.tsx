import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { ApiError } from "@/lib/api/errors";
import type { DNSRecord } from "@/types/dns-record";

import { DNSRecordForm } from "./dns-record-form";

const mocks = vi.hoisted(() => ({
  onOpenChange: vi.fn(),
  create: {
    mutateAsync: vi.fn(),
    isPending: false,
    error: null as unknown,
  },
  update: {
    mutateAsync: vi.fn(),
    isPending: false,
    error: null as unknown,
  },
}));

vi.mock("@/hooks/dns-records/queries", () => ({
  useCreateDNSRecord: () => mocks.create,
  useUpdateDNSRecord: () => mocks.update,
}));

const record: DNSRecord = {
  id: "RECORD",
  name: "api.example.com.",
  record_type: "A",
  values: ["192.0.2.10", "192.0.2.11"],
  ttl: 300,
  routing_policy: "SIMPLE",
  alias: false,
  is_system: false,
  created_at: "2026-07-26T10:00:00Z",
  updated_at: "2026-07-26T10:00:00Z",
};

function renderCreate() {
  return render(
    <DNSRecordForm
      onOpenChange={mocks.onOpenChange}
      open
      zoneId="ZONE"
      zoneName="example.com."
    />,
  );
}

describe("DNSRecordForm", () => {
  beforeEach(() => {
    mocks.onOpenChange.mockReset();
    mocks.create.mutateAsync.mockReset();
    mocks.create.isPending = false;
    mocks.create.error = null;
    mocks.update.mutateAsync.mockReset();
    mocks.update.isPending = false;
    mocks.update.error = null;
  });

  it("lists nine creatable types and excludes SOA", () => {
    renderCreate();
    const options = screen.getAllByRole("option").map((option) => option.textContent);
    expect(options).toEqual([
      "A",
      "AAAA",
      "CNAME",
      "TXT",
      "MX",
      "NS",
      "PTR",
      "SRV",
      "CAA",
    ]);
    expect(options).not.toContain("SOA");
  });

  it("accepts a blank name as the apex and submits the exact contract", async () => {
    const user = userEvent.setup();
    mocks.create.mutateAsync.mockResolvedValue({
      ...record,
      name: "example.com.",
    });
    renderCreate();
    await user.type(screen.getByLabelText("Value"), "192.0.2.10");
    await user.click(screen.getByRole("button", { name: "Create record" }));
    await waitFor(() =>
      expect(mocks.create.mutateAsync).toHaveBeenCalledWith({
        name: "",
        record_type: "A",
        values: ["192.0.2.10"],
        ttl: 300,
        routing_policy: "SIMPLE",
        alias: false,
      }),
    );
    expect(mocks.onOpenChange).toHaveBeenCalledWith(false);
  });

  it("requires values and validates TTL", async () => {
    const user = userEvent.setup();
    renderCreate();
    fireEvent.change(screen.getByLabelText("TTL"), { target: { value: "0" } });
    await user.click(screen.getByRole("button", { name: "Create record" }));
    expect(
      await screen.findByText("Enter at least one record value."),
    ).toBeInTheDocument();
    expect(screen.getByText("TTL must be at least 1 second.")).toBeInTheDocument();
  });

  it("removes empty lines and stably deduplicates values", async () => {
    const user = userEvent.setup();
    mocks.create.mutateAsync.mockResolvedValue(record);
    renderCreate();
    await user.type(
      screen.getByLabelText("Value"),
      "192.0.2.10{enter}{enter}192.0.2.11{enter}192.0.2.10",
    );
    await user.click(screen.getByRole("button", { name: "Create record" }));
    await waitFor(() =>
      expect(mocks.create.mutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          values: ["192.0.2.10", "192.0.2.11"],
        }),
      ),
    );
  });

  it("enforces one local CNAME value", async () => {
    const user = userEvent.setup();
    renderCreate();
    await user.selectOptions(screen.getByLabelText("Record type"), "CNAME");
    await user.type(
      screen.getByLabelText("Value"),
      "one.example.com.{enter}two.example.com.",
    );
    await user.click(screen.getByRole("button", { name: "Create record" }));
    expect(
      await screen.findByText("CNAME records require exactly one value."),
    ).toBeInTheDocument();
    expect(mocks.create.mutateAsync).not.toHaveBeenCalled();
  });

  it("maps duplicate, CNAME, and network errors safely", () => {
    mocks.create.error = new ApiError(
      409,
      "DNS_RECORD_ALREADY_EXISTS",
      "Raw duplicate.",
    );
    const view = renderCreate();
    expect(
      screen.getByText("A record with this name and type already exists."),
    ).toBeInTheDocument();

    mocks.create.error = new ApiError(
      409,
      "CNAME_CONFLICT",
      "A CNAME cannot coexist at this name.",
    );
    view.rerender(
      <DNSRecordForm
        onOpenChange={mocks.onOpenChange}
        open
        zoneId="ZONE"
        zoneName="example.com."
      />,
    );
    expect(
      screen.getByText("A CNAME cannot coexist at this name."),
    ).toBeInTheDocument();

    mocks.create.error = new ApiError(0, "NETWORK_ERROR", "Offline");
    view.rerender(
      <DNSRecordForm
        onOpenChange={mocks.onOpenChange}
        open
        zoneId="ZONE"
        zoneName="example.com."
      />,
    );
    expect(screen.getByText(/API is unreachable/)).toBeInTheDocument();
  });

  it("preserves failed create values", async () => {
    const user = userEvent.setup();
    mocks.create.mutateAsync.mockRejectedValue(new Error("failed"));
    renderCreate();
    await user.type(screen.getByLabelText("Record name"), "api");
    await user.type(screen.getByLabelText("Value"), "192.0.2.10");
    await user.click(screen.getByRole("button", { name: "Create record" }));
    await waitFor(() => expect(mocks.create.mutateAsync).toHaveBeenCalled());
    expect(screen.getByLabelText("Record name")).toHaveValue("api");
    expect(screen.getByLabelText("Value")).toHaveValue("192.0.2.10");
  });

  it("prepopulates edit context and sends only values and TTL", async () => {
    const user = userEvent.setup();
    mocks.update.mutateAsync.mockResolvedValue(record);
    render(
      <DNSRecordForm
        onOpenChange={mocks.onOpenChange}
        open
        record={record}
        zoneId="ZONE"
        zoneName="example.com."
      />,
    );
    expect(screen.getByText("api.example.com.")).toBeInTheDocument();
    expect(screen.getByText("A")).toBeInTheDocument();
    expect(screen.queryByLabelText("Record name")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Value")).toHaveValue(
      "192.0.2.10\n192.0.2.11",
    );
    await user.clear(screen.getByLabelText("Value"));
    await user.type(screen.getByLabelText("Value"), "192.0.2.20");
    await user.clear(screen.getByLabelText("TTL"));
    await user.type(screen.getByLabelText("TTL"), "600");
    await user.click(screen.getByRole("button", { name: "Save changes" }));
    await waitFor(() =>
      expect(mocks.update.mutateAsync).toHaveBeenCalledWith({
        values: ["192.0.2.20"],
        ttl: 600,
      }),
    );
    expect(mocks.onOpenChange).toHaveBeenCalledWith(false);
  });

  it("keeps edit open after failure and disables controls while pending", async () => {
    mocks.update.mutateAsync.mockRejectedValue(new Error("failed"));
    const view = render(
      <DNSRecordForm
        onOpenChange={mocks.onOpenChange}
        open
        record={record}
        zoneId="ZONE"
        zoneName="example.com."
      />,
    );
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Save changes" }));
    await waitFor(() => expect(mocks.update.mutateAsync).toHaveBeenCalled());
    expect(mocks.onOpenChange).not.toHaveBeenCalledWith(false);

    mocks.update.isPending = true;
    view.rerender(
      <DNSRecordForm
        onOpenChange={mocks.onOpenChange}
        open
        record={record}
        zoneId="ZONE"
        zoneName="example.com."
      />,
    );
    expect(screen.getByRole("button", { name: /Updating DNS record/ })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeDisabled();
  });

  it("protects a system record even when the editor is reached directly", () => {
    render(
      <DNSRecordForm
        onOpenChange={mocks.onOpenChange}
        open
        record={{ ...record, is_system: true, record_type: "SOA" }}
        zoneId="ZONE"
        zoneName="example.com."
      />,
    );
    expect(screen.getByText("Editing is unavailable")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Save changes" })).not.toBeInTheDocument();
  });
});
