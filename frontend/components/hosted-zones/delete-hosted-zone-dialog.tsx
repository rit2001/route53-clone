"use client";

import { useState } from "react";
import { toast } from "sonner";

import { ErrorAlert } from "@/components/feedback/error-alert";
import { DialogFrame } from "@/components/ui/dialog-frame";
import { Spinner } from "@/components/ui/spinner";
import { useDeleteHostedZone } from "@/hooks/hosted-zones/queries";
import { getHostedZoneErrorMessage } from "@/lib/hosted-zones/errors";
import type { HostedZoneListItem } from "@/types/hosted-zone";

type DeleteHostedZoneDialogProps = Readonly<{
  open: boolean;
  zone: HostedZoneListItem;
  onDeleted: () => void;
  onOpenChange: (open: boolean) => void;
}>;

export function DeleteHostedZoneDialog({
  open,
  zone,
  onDeleted,
  onOpenChange,
}: DeleteHostedZoneDialogProps) {
  const [confirmation, setConfirmation] = useState("");
  const mutation = useDeleteHostedZone(zone.id);
  const matches = confirmation === zone.name;

  function changeOpen(nextOpen: boolean) {
    if (mutation.isPending) {
      return;
    }
    if (nextOpen) {
      mutation.reset();
    } else {
      setConfirmation("");
    }
    onOpenChange(nextOpen);
  }

  async function deleteZone() {
    if (!matches || mutation.isPending) {
      return;
    }
    try {
      await mutation.mutateAsync();
      toast.success(`Hosted zone ${zone.name} deleted.`);
      setConfirmation("");
      onOpenChange(false);
      onDeleted();
    } catch {
      // The mutation error is rendered inline so the dialog remains recoverable.
    }
  }

  return (
    <DialogFrame
      description={`Deleting ${zone.name} removes every record set stored inside this clone.`}
      onOpenChange={changeOpen}
      open={open}
      title="Delete hosted zone?"
    >
      <div className="space-y-4 p-5">
        <div className="rounded-[var(--radius-sm)] border border-[var(--danger)] bg-[var(--danger-soft)] p-3 text-sm">
          <p className="font-semibold">This action cannot be undone.</p>
          <p className="mt-1 text-[var(--muted-strong)]">
            The {zone.zone_type.toLowerCase()} zone contains {zone.record_count}{" "}
            record set{zone.record_count === 1 ? "" : "s"}. Generated NS and SOA
            records are removed too. No real DNS delegation is affected.
          </p>
        </div>
        {mutation.error ? (
          <ErrorAlert
            message={getHostedZoneErrorMessage(mutation.error, "delete")}
            title="Hosted zone was not deleted"
          />
        ) : null}
        <div>
          <label className="field-label" htmlFor="delete-zone-confirmation">
            Type <strong>{zone.name}</strong> to confirm
          </label>
          <input
            autoComplete="off"
            className="text-input"
            disabled={mutation.isPending}
            id="delete-zone-confirmation"
            onChange={(event) => setConfirmation(event.target.value)}
            value={confirmation}
          />
        </div>
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
          disabled={!matches || mutation.isPending}
          onClick={() => void deleteZone()}
          type="button"
        >
          {mutation.isPending ? (
            <Spinner label="Deleting hosted zone" />
          ) : null}
          Delete hosted zone
        </button>
      </div>
    </DialogFrame>
  );
}
