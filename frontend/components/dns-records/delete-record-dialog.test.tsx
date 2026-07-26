import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { ApiError } from "@/lib/api/errors";
import type { DNSRecord } from "@/types/dns-record";

import { DeleteRecordDialog } from "./delete-record-dialog";

const mocks = vi.hoisted(() => ({
  mutateAsync: vi.fn(),
  reset: vi.fn(),
  mutation: {
    isPending: false,
    error: null as unknown,
  },
}));

vi.mock("@/hooks/dns-records/queries", () => ({
  useDeleteDNSRecord: () => ({
    ...mocks.mutation,
    mutateAsync: mocks.mutateAsync,
    reset: mocks.reset,
  }),
}));

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

describe("DeleteRecordDialog", () => {
  beforeEach(() => {
    mocks.mutateAsync.mockReset();
    mocks.reset.mockReset();
    mocks.mutation.isPending = false;
    mocks.mutation.error = null;
  });

  it("confirms and completes a successful 204 deletion", async () => {
    const user = userEvent.setup();
    const onDeleted = vi.fn();
    const onOpenChange = vi.fn();
    mocks.mutateAsync.mockResolvedValue(undefined);
    render(
      <DeleteRecordDialog
        onDeleted={onDeleted}
        onOpenChange={onOpenChange}
        open
        record={record}
        zoneId="ZONE"
      />,
    );
    expect(screen.getByRole("dialog")).toHaveTextContent("192.0.2.10");
    await user.click(screen.getByRole("button", { name: "Delete record" }));
    await waitFor(() => expect(mocks.mutateAsync).toHaveBeenCalledOnce());
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(onDeleted).toHaveBeenCalledOnce();
  });

  it("protects system records in the confirmation layer", () => {
    render(
      <DeleteRecordDialog
        onDeleted={vi.fn()}
        onOpenChange={vi.fn()}
        open
        record={{ ...record, is_system: true, record_type: "SOA" }}
        zoneId="ZONE"
      />,
    );
    expect(screen.getByText("System record protected")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Delete record" })).toBeDisabled();
  });

  it("keeps the dialog recoverable on backend protection or failure", () => {
    mocks.mutation.error = new ApiError(
      409,
      "SYSTEM_RECORD_PROTECTED",
      "Protected.",
    );
    render(
      <DeleteRecordDialog
        onDeleted={vi.fn()}
        onOpenChange={vi.fn()}
        open
        record={record}
        zoneId="ZONE"
      />,
    );
    expect(
      screen.getByText(
        "System-generated NS and SOA records cannot be modified.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });
});
