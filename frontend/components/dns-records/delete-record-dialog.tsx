"use client";

import { useState } from "react";
import { toast } from "sonner";

import { ErrorAlert } from "@/components/feedback/error-alert";
import { DialogFrame } from "@/components/ui/dialog-frame";
import { Spinner } from "@/components/ui/spinner";
import { useDeleteDNSRecord } from "@/hooks/dns-records/queries";
import { getDNSRecordErrorMessage } from "@/lib/dns-records/errors";
import type { DNSRecord } from "@/types/dns-record";

export function DeleteRecordDialog({
  open,
  record,
  zoneId,
  onDeleted,
  onOpenChange,
}: Readonly<{
  open: boolean;
  record: DNSRecord;
  zoneId: string;
  onDeleted: () => void;
  onOpenChange: (open: boolean) => void;
}>) {
  const [blockedMessage] = useState(
    record.is_system
      ? "System-generated NS and SOA records cannot be modified."
      : null,
  );
  const mutation = useDeleteDNSRecord(zoneId, record.id);

  function changeOpen(nextOpen: boolean) {
    if (!mutation.isPending) {
      if (nextOpen) {
        mutation.reset();
      }
      onOpenChange(nextOpen);
    }
  }

  async function deleteRecord() {
    if (record.is_system || mutation.isPending) {
      return;
    }
    try {
      await mutation.mutateAsync();
      toast.success(`${record.record_type} record deleted.`);
      onOpenChange(false);
      onDeleted();
    } catch {
      // Inline mutation feedback keeps the confirmation recoverable.
    }
  }

  return (
    <DialogFrame
      description={`${record.name} · ${record.record_type}`}
      onOpenChange={changeOpen}
      open={open}
      title={`Delete ${record.record_type} record?`}
    >
      <div className="space-y-4 p-5">
        {blockedMessage ? (
          <ErrorAlert message={blockedMessage} title="System record protected" />
        ) : null}
        {mutation.error ? (
          <ErrorAlert
            message={getDNSRecordErrorMessage(mutation.error, "delete")}
            title="Record was not deleted"
          />
        ) : null}
        <div className="rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface-subtle)] p-3">
          <p className="text-xs font-semibold text-[var(--muted)]">Values</p>
          <ul className="mt-2 max-h-32 space-y-1 overflow-y-auto font-mono text-xs">
            {record.values.slice(0, 5).map((value, index) => (
              <li className="break-all" key={`${value}-${index}`}>
                {value}
              </li>
            ))}
          </ul>
          {record.values.length > 5 ? (
            <p className="mt-2 text-xs text-[var(--muted)]">
              And {record.values.length - 5} more values
            </p>
          ) : null}
        </div>
        <p className="text-sm">
          This action cannot be undone. It changes only the configuration stored
          by this clone and does not affect real DNS.
        </p>
      </div>
      <div className="flex justify-end gap-2 border-t border-[var(--border)] bg-[var(--surface-subtle)] px-5 py-3">
        <button
          className="secondary-button"
          disabled={mutation.isPending}
          onClick={() => changeOpen(false)}
          type="button"
        >
          Cancel
        </button>
        <button
          className="danger-button"
          disabled={record.is_system || mutation.isPending}
          onClick={() => void deleteRecord()}
          type="button"
        >
          {mutation.isPending ? <Spinner label="Deleting DNS record" /> : null}
          Delete record
        </button>
      </div>
    </DialogFrame>
  );
}
