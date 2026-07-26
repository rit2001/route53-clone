"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { ErrorAlert } from "@/components/feedback/error-alert";
import { DialogFrame } from "@/components/ui/dialog-frame";
import { Spinner } from "@/components/ui/spinner";
import { useUpdateHostedZone } from "@/hooks/hosted-zones/queries";
import { getHostedZoneErrorMessage } from "@/lib/hosted-zones/errors";
import type { HostedZoneDetail } from "@/types/hosted-zone";

const editCommentSchema = z.object({
  comment: z
    .string()
    .max(256, "Description must be 256 characters or fewer."),
});

type EditCommentValues = z.infer<typeof editCommentSchema>;

type EditCommentDialogProps = Readonly<{
  open: boolean;
  zone: HostedZoneDetail;
  onOpenChange: (open: boolean) => void;
}>;

export function EditCommentDialog({
  open,
  zone,
  onOpenChange,
}: EditCommentDialogProps) {
  const mutation = useUpdateHostedZone(zone.id);
  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors, isSubmitting },
  } = useForm<EditCommentValues>({
    resolver: zodResolver(editCommentSchema),
    defaultValues: { comment: zone.comment ?? "" },
  });
  const comment = useWatch({ control, name: "comment" });
  const pending = isSubmitting || mutation.isPending;

  function changeOpen(nextOpen: boolean) {
    if (pending) {
      return;
    }
    if (nextOpen) {
      mutation.reset();
      reset({ comment: zone.comment ?? "" });
    }
    onOpenChange(nextOpen);
  }

  async function submit(values: EditCommentValues) {
    try {
      await mutation.mutateAsync({ comment: values.comment.trim() || null });
      toast.success(`Hosted zone ${zone.name} updated.`);
      onOpenChange(false);
    } catch {
      // Inline mutation feedback keeps the dialog and edited value available.
    }
  }

  return (
    <DialogFrame
      description="Hosted zone name and type cannot be changed after creation."
      onOpenChange={changeOpen}
      open={open}
      title="Edit description"
    >
      <form onSubmit={(event) => void handleSubmit(submit)(event)}>
        <div className="space-y-4 p-5">
          {mutation.error ? (
            <ErrorAlert
              message={getHostedZoneErrorMessage(mutation.error, "update")}
              title="Description was not updated"
            />
          ) : null}
          <div>
            <label className="field-label" htmlFor="edit-zone-comment">
              Description
            </label>
            <textarea
              aria-describedby={
                errors.comment
                  ? "edit-comment-count edit-comment-error"
                  : "edit-comment-count"
              }
              aria-invalid={Boolean(errors.comment)}
              autoFocus
              className="text-input min-h-24 resize-y"
              disabled={pending}
              id="edit-zone-comment"
              maxLength={256}
              {...register("comment")}
            />
            <p className="field-help text-right" id="edit-comment-count">
              {comment.length}/256 characters
            </p>
            {errors.comment ? (
              <p className="field-error" id="edit-comment-error">
                {errors.comment.message}
              </p>
            ) : null}
          </div>
        </div>
        <div className="flex justify-end gap-2 border-t border-[var(--border)] bg-[var(--surface-subtle)] px-5 py-3">
          <button
            className="secondary-button"
            disabled={pending}
            onClick={() => changeOpen(false)}
            type="button"
          >
            Cancel
          </button>
          <button className="primary-button" disabled={pending} type="submit">
            {pending ? <Spinner label="Saving description" /> : null}
            Save changes
          </button>
        </div>
      </form>
    </DialogFrame>
  );
}
