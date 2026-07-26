"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Info } from "lucide-react";
import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { ErrorAlert } from "@/components/feedback/error-alert";
import { Spinner } from "@/components/ui/spinner";
import { useCreateHostedZone } from "@/hooks/hosted-zones/queries";
import { getHostedZoneErrorMessage } from "@/lib/hosted-zones/errors";
import type { HostedZoneCreateInput } from "@/types/hosted-zone";

const hostedZoneSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Enter a domain name.")
    .max(512, "Domain name must be 512 characters or fewer."),
  comment: z
    .string()
    .max(256, "Description must be 256 characters or fewer."),
  zone_type: z.enum(["PUBLIC", "PRIVATE"]),
});

type HostedZoneFormValues = z.infer<typeof hostedZoneSchema>;

export function HostedZoneForm() {
  const router = useRouter();
  const mutation = useCreateHostedZone();
  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<HostedZoneFormValues>({
    resolver: zodResolver(hostedZoneSchema),
    defaultValues: {
      name: "",
      comment: "",
      zone_type: "PUBLIC",
    },
  });
  const zoneType = useWatch({ control, name: "zone_type" });
  const comment = useWatch({ control, name: "comment" });
  const pending = isSubmitting || mutation.isPending;

  async function submit(values: HostedZoneFormValues) {
    const input: HostedZoneCreateInput = {
      name: values.name.trim(),
      zone_type: values.zone_type,
      comment: values.comment.trim() || null,
    };
    try {
      const zone = await mutation.mutateAsync(input);
      toast.success(`Hosted zone ${zone.name} created.`);
      router.push(`/route53/hosted-zones/${encodeURIComponent(zone.id)}`);
    } catch {
      // Mutation state renders the safe error without clearing entered values.
    }
  }

  return (
    <form
      className="surface-panel max-w-3xl"
      noValidate
      onSubmit={(event) => void handleSubmit(submit)(event)}
    >
      <div className="space-y-5 p-5 sm:p-6">
        {mutation.error ? (
          <ErrorAlert
            message={getHostedZoneErrorMessage(mutation.error, "create")}
            title="Hosted zone was not created"
          />
        ) : null}
        <div>
          <label className="field-label" htmlFor="zone-name">
            Domain name
          </label>
          <input
            aria-describedby={
              errors.name ? "zone-name-help zone-name-error" : "zone-name-help"
            }
            aria-invalid={Boolean(errors.name)}
            autoComplete="off"
            className="text-input"
            id="zone-name"
            maxLength={512}
            placeholder="example.com"
            {...register("name")}
          />
          <p className="field-help" id="zone-name-help">
            Enter a registered domain name. The backend stores it in canonical
            form with a trailing dot.
          </p>
          {errors.name ? (
            <p className="field-error" id="zone-name-error">
              {errors.name.message}
            </p>
          ) : null}
        </div>

        <div>
          <label className="field-label" htmlFor="zone-comment">
            Description <span className="font-normal text-[var(--muted)]">(optional)</span>
          </label>
          <textarea
            aria-describedby={
              errors.comment
                ? "zone-comment-count zone-comment-error"
                : "zone-comment-count"
            }
            aria-invalid={Boolean(errors.comment)}
            className="text-input min-h-24 resize-y"
            id="zone-comment"
            maxLength={256}
            {...register("comment")}
          />
          <p className="field-help text-right" id="zone-comment-count">
            {comment.length}/256 characters
          </p>
          {errors.comment ? (
            <p className="field-error" id="zone-comment-error">
              {errors.comment.message}
            </p>
          ) : null}
        </div>

        <fieldset>
          <legend className="field-label">Type</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            <label className="radio-option">
              <input
                className="mt-1"
                type="radio"
                value="PUBLIC"
                {...register("zone_type")}
              />
              <span>
                <span className="block font-semibold">Public hosted zone</span>
                <span className="mt-0.5 block text-xs text-[var(--muted)]">
                  Route traffic on the internet.
                </span>
              </span>
            </label>
            <label className="radio-option">
              <input
                className="mt-1"
                type="radio"
                value="PRIVATE"
                {...register("zone_type")}
              />
              <span>
                <span className="block font-semibold">Private hosted zone</span>
                <span className="mt-0.5 block text-xs text-[var(--muted)]">
                  Route traffic within a mocked private network.
                </span>
              </span>
            </label>
          </div>
        </fieldset>

        {zoneType === "PRIVATE" ? (
          <div
            className="flex gap-2 rounded-[var(--radius-sm)] border border-[var(--info-border)] bg-[var(--info-soft)] p-3 text-sm"
            role="note"
          >
            <Info
              aria-hidden="true"
              className="mt-0.5 size-4 shrink-0 text-[var(--link)]"
            />
            Private network association is mocked for this assignment. No real
            VPC will be created.
          </div>
        ) : null}
      </div>
      <div className="flex justify-end gap-2 border-t border-[var(--border)] bg-[var(--surface-subtle)] px-5 py-3">
        <button
          className="secondary-button"
          disabled={pending}
          onClick={() => router.push("/route53/hosted-zones")}
          type="button"
        >
          Cancel
        </button>
        <button className="primary-button" disabled={pending} type="submit">
          {pending ? <Spinner label="Creating hosted zone" /> : null}
          Create hosted zone
        </button>
      </div>
    </form>
  );
}
