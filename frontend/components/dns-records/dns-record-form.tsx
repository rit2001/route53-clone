"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Info } from "lucide-react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { ErrorAlert } from "@/components/feedback/error-alert";
import { DialogFrame } from "@/components/ui/dialog-frame";
import { Spinner } from "@/components/ui/spinner";
import {
  useCreateDNSRecord,
  useUpdateDNSRecord,
} from "@/hooks/dns-records/queries";
import { getDNSRecordErrorMessage } from "@/lib/dns-records/errors";
import {
  CREATABLE_DNS_RECORD_TYPES,
  parseRecordValues,
  RECORD_TYPE_HELP,
} from "@/lib/dns-records/form-values";
import type {
  CreatableDNSRecordType,
  DNSRecord,
  DNSRecordCreateInput,
  DNSRecordUpdateInput,
} from "@/types/dns-record";

const MAX_TTL = 2_147_483_647;
const recordFormSchema = z
  .object({
    name: z
      .string()
      .max(512, "Record name must be 512 characters or fewer.")
      .refine(
        (value) =>
          !value.includes("://") &&
          !value.includes("/") &&
          /^[\x00-\x7F]*$/.test(value),
        "Enter a DNS record name, not a URL or non-ASCII name.",
      ),
    record_type: z.enum([
      "A",
      "AAAA",
      "CNAME",
      "TXT",
      "MX",
      "NS",
      "PTR",
      "SRV",
      "CAA",
    ]),
    valuesText: z
      .string()
      .max(204_800, "Record values are too long for one record set."),
    ttl: z
      .number({ message: "Enter a valid TTL." })
      .int("TTL must be a whole number.")
      .min(1, "TTL must be at least 1 second.")
      .max(MAX_TTL, `TTL must be ${MAX_TTL} or less.`),
  })
  .superRefine((values, context) => {
    const parsed = parseRecordValues(values.valuesText);
    if (parsed.length === 0) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["valuesText"],
        message: "Enter at least one record value.",
      });
    }
    if (parsed.length > 100) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["valuesText"],
        message: "A record set can contain at most 100 values.",
      });
    }
    if (parsed.some((value) => value.length > 2_048)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["valuesText"],
        message: "Each record value must be 2048 characters or fewer.",
      });
    }
    if (values.record_type === "CNAME" && parsed.length !== 1) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["valuesText"],
        message: "CNAME records require exactly one value.",
      });
    }
  });

type RecordFormValues = z.infer<typeof recordFormSchema>;

export function DNSRecordForm({
  open,
  zoneId,
  zoneName,
  record,
  onOpenChange,
}: Readonly<{
  open: boolean;
  zoneId: string;
  zoneName: string;
  record?: DNSRecord;
  onOpenChange: (open: boolean) => void;
}>) {
  const creating = record === undefined;
  const createMutation = useCreateDNSRecord(zoneId);
  const updateMutation = useUpdateDNSRecord(zoneId, record?.id ?? "");
  const mutation = creating ? createMutation : updateMutation;
  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<RecordFormValues>({
    resolver: zodResolver(recordFormSchema),
    defaultValues: {
      name: record?.name ?? "",
      record_type:
        record?.record_type === "SOA"
          ? "A"
          : ((record?.record_type as CreatableDNSRecordType | undefined) ??
            "A"),
      valuesText: record?.values.join("\n") ?? "",
      ttl: record?.ttl ?? 300,
    },
  });
  const recordType = useWatch({ control, name: "record_type" });
  const pending = isSubmitting || mutation.isPending;
  const help = RECORD_TYPE_HELP[recordType];

  function changeOpen(nextOpen: boolean) {
    if (!pending) {
      onOpenChange(nextOpen);
    }
  }

  async function submit(values: RecordFormValues) {
    const parsedValues = parseRecordValues(values.valuesText);
    try {
      if (creating) {
        const input: DNSRecordCreateInput = {
          name: values.name.trim(),
          record_type: values.record_type,
          values: parsedValues,
          ttl: values.ttl,
          routing_policy: "SIMPLE",
          alias: false,
        };
        const created = await createMutation.mutateAsync(input);
        toast.success(`${created.record_type} record created.`);
      } else {
        const input: DNSRecordUpdateInput = {
          values: parsedValues,
          ttl: values.ttl,
        };
        await updateMutation.mutateAsync(input);
        toast.success(`${record.record_type} record updated.`);
      }
      onOpenChange(false);
    } catch {
      // Mutation state renders the safe error and preserves form values.
    }
  }

  if (record?.is_system) {
    return (
      <DialogFrame
        description={`${record.record_type} record ${record.name}`}
        onOpenChange={onOpenChange}
        open={open}
        title="System record protected"
      >
        <div className="p-5">
          <ErrorAlert
            message="System-generated NS and SOA records cannot be modified."
            title="Editing is unavailable"
          />
        </div>
        <div className="flex justify-end border-t border-[var(--border)] bg-[var(--surface-subtle)] px-5 py-3">
          <button
            className="secondary-button"
            onClick={() => onOpenChange(false)}
            type="button"
          >
            Close
          </button>
        </div>
      </DialogFrame>
    );
  }

  return (
    <DialogFrame
      description={
        creating
          ? `Create a persisted record set inside ${zoneName}.`
          : "Only record values and TTL can be changed after creation."
      }
      onOpenChange={changeOpen}
      open={open}
      size="wide"
      title={creating ? "Create record" : "Edit record"}
    >
      <form
        noValidate
        onSubmit={(event) => void handleSubmit(submit)(event)}
      >
        <div className="grid gap-5 p-5 sm:grid-cols-2">
          {mutation.error ? (
            <div className="sm:col-span-2">
              <ErrorAlert
                message={getDNSRecordErrorMessage(
                  mutation.error,
                  creating ? "create" : "update",
                )}
                title={creating ? "Record was not created" : "Record was not updated"}
              />
            </div>
          ) : null}

          {creating ? (
            <>
              <div>
                <label className="field-label" htmlFor="record-name">
                  Record name
                </label>
                <input
                  aria-describedby={
                    errors.name
                      ? "record-name-help record-name-error"
                      : "record-name-help"
                  }
                  aria-invalid={Boolean(errors.name)}
                  autoComplete="off"
                  className="text-input"
                  id="record-name"
                  maxLength={512}
                  placeholder="api"
                  {...register("name")}
                />
                <p className="field-help" id="record-name-help">
                  Leave blank or enter @ for the apex. Relative names are
                  appended to {zoneName}
                </p>
                {errors.name ? (
                  <p className="field-error" id="record-name-error">
                    {errors.name.message}
                  </p>
                ) : null}
              </div>
              <div>
                <label className="field-label" htmlFor="record-type">
                  Record type
                </label>
                <select
                  className="text-input"
                  id="record-type"
                  {...register("record_type")}
                >
                  {CREATABLE_DNS_RECORD_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>
            </>
          ) : (
            <div className="sm:col-span-2">
              <dl className="grid gap-3 border border-[var(--border)] bg-[var(--surface-subtle)] p-3 text-sm sm:grid-cols-2">
                <div>
                  <dt className="font-semibold text-[var(--muted)]">Record name</dt>
                  <dd className="mt-1 break-all">{record.name}</dd>
                </div>
                <div>
                  <dt className="font-semibold text-[var(--muted)]">Record type</dt>
                  <dd className="mt-1">{record.record_type}</dd>
                </div>
              </dl>
            </div>
          )}

          <div className="sm:col-span-2">
            <label className="field-label" htmlFor="record-values">
              Value
            </label>
            <textarea
              aria-describedby={
                errors.valuesText
                  ? "record-values-help record-values-error"
                  : "record-values-help"
              }
              aria-invalid={Boolean(errors.valuesText)}
              className="text-input min-h-40 resize-y font-mono text-xs"
              id="record-values"
              placeholder={help.example}
              {...register("valuesText")}
            />
            <p className="field-help" id="record-values-help">
              {help.guidance}. Enter one value per line. Example:{" "}
              <code>{help.example}</code>
            </p>
            {errors.valuesText ? (
              <p className="field-error" id="record-values-error">
                {errors.valuesText.message}
              </p>
            ) : null}
          </div>

          <div>
            <label className="field-label" htmlFor="record-ttl">
              TTL
            </label>
            <input
              aria-describedby={
                errors.ttl ? "record-ttl-help record-ttl-error" : "record-ttl-help"
              }
              aria-invalid={Boolean(errors.ttl)}
              className="text-input"
              id="record-ttl"
              max={MAX_TTL}
              min={1}
              type="number"
              {...register("ttl", { valueAsNumber: true })}
            />
            <p className="field-help" id="record-ttl-help">
              Time to live in seconds
            </p>
            {errors.ttl ? (
              <p className="field-error" id="record-ttl-error">
                {errors.ttl.message}
              </p>
            ) : null}
          </div>

          <div>
            <span className="field-label">Routing policy</span>
            <div className="text-input flex items-center bg-[var(--surface-subtle)]">
              Simple
            </div>
            <p className="field-help">Only simple routing is supported.</p>
          </div>

          {creating ? (
            <div
              className="flex gap-2 rounded-[var(--radius-sm)] border border-[var(--info-border)] bg-[var(--info-soft)] p-3 text-sm sm:col-span-2"
              role="note"
            >
              <Info
                aria-hidden="true"
                className="mt-0.5 size-4 shrink-0 text-[var(--link)]"
              />
              Alias records are not supported in this assignment. This record
              will be created as a non-alias record.
            </div>
          ) : null}
        </div>
        <div className="sticky bottom-0 flex justify-end gap-2 border-t border-[var(--border)] bg-[var(--surface-subtle)] px-5 py-3">
          <button
            className="secondary-button"
            disabled={pending}
            onClick={() => changeOpen(false)}
            type="button"
          >
            Cancel
          </button>
          <button className="primary-button" disabled={pending} type="submit">
            {pending ? (
              <Spinner
                label={creating ? "Creating DNS record" : "Updating DNS record"}
              />
            ) : null}
            {creating ? "Create record" : "Save changes"}
          </button>
        </div>
      </form>
    </DialogFrame>
  );
}
