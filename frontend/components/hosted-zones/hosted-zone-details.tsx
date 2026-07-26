"use client";

import { Copy, FilePenLine, Info, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { ErrorAlert } from "@/components/feedback/error-alert";
import { DeleteHostedZoneDialog } from "@/components/hosted-zones/delete-hosted-zone-dialog";
import { EditCommentDialog } from "@/components/hosted-zones/edit-comment-dialog";
import { HostedZoneTableSkeleton } from "@/components/hosted-zones/hosted-zone-table-skeleton";
import { ZoneTypeBadge } from "@/components/hosted-zones/zone-type-badge";
import { PageHeader } from "@/components/layout/page-header";
import { useHostedZone } from "@/hooks/hosted-zones/queries";
import { isApiError } from "@/lib/api/errors";
import { getHostedZoneErrorMessage } from "@/lib/hosted-zones/errors";
import { copyText } from "@/lib/utilities/clipboard";
import { formatDateTime } from "@/lib/utilities/date";

type HostedZoneDetailsProps = Readonly<{
  zoneId: string;
}>;

export function HostedZoneDetails({ zoneId }: HostedZoneDetailsProps) {
  const router = useRouter();
  const query = useHostedZone(zoneId);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  async function copy(value: string, label: string) {
    if (await copyText(value)) {
      toast.success(`${label} copied.`);
    } else {
      toast.error(`Unable to copy ${label.toLowerCase()}.`);
    }
  }

  if (query.isPending) {
    return (
      <>
        <PageHeader
          breadcrumbs={[
            { label: "Route 53", href: "/route53/dashboard" },
            { label: "Hosted zones", href: "/route53/hosted-zones" },
            { label: "Loading…" },
          ]}
          title="Hosted zone"
        />
        <section className="surface-panel overflow-hidden">
          <HostedZoneTableSkeleton />
        </section>
      </>
    );
  }

  if (
    query.isError &&
    isApiError(query.error) &&
    query.error.code === "HOSTED_ZONE_NOT_FOUND"
  ) {
    return (
      <>
        <PageHeader
          breadcrumbs={[
            { label: "Route 53", href: "/route53/dashboard" },
            { label: "Hosted zones", href: "/route53/hosted-zones" },
            { label: "Not found" },
          ]}
          title="Hosted zone not found"
        />
        <section className="surface-panel p-5">
          <p className="text-sm text-[var(--muted)]">
            The hosted zone may have been deleted or is not available to this
            account.
          </p>
          <button
            className="secondary-button mt-4"
            onClick={() => router.push("/route53/hosted-zones")}
            type="button"
          >
            Return to hosted zones
          </button>
        </section>
      </>
    );
  }

  if (query.isError || !query.data) {
    return (
      <>
        <PageHeader title="Hosted zone" />
        <ErrorAlert
          message={getHostedZoneErrorMessage(query.error, "detail")}
          onRetry={() => void query.refetch()}
          title="Unable to load hosted zone"
        />
      </>
    );
  }

  const zone = query.data;
  return (
    <>
      <PageHeader
        actions={
          <>
            <button
              className="secondary-button"
              onClick={() => setEditOpen(true)}
              type="button"
            >
              <FilePenLine aria-hidden="true" className="size-4" />
              Edit description
            </button>
            <button
              className="danger-secondary-button"
              onClick={() => setDeleteOpen(true)}
              type="button"
            >
              <Trash2 aria-hidden="true" className="size-4" />
              Delete hosted zone
            </button>
          </>
        }
        breadcrumbs={[
          { label: "Route 53", href: "/route53/dashboard" },
          { label: "Hosted zones", href: "/route53/hosted-zones" },
          { label: zone.name },
        ]}
        secondary={<ZoneTypeBadge type={zone.zone_type} />}
        title={zone.name}
      />

      <div
        className="mb-4 flex items-start gap-2 rounded-[var(--radius-sm)] border border-[var(--info-border)] bg-[var(--info-soft)] p-3 text-sm"
        role="note"
      >
        <Info
          aria-hidden="true"
          className="mt-0.5 size-4 shrink-0 text-[var(--link)]"
        />
        This clone persists Route53-style configuration but does not provide real
        DNS resolution.
      </div>

      <section
        aria-labelledby="zone-details-heading"
        className="surface-panel overflow-hidden"
      >
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] px-5 py-3">
          <h2 className="text-base font-semibold" id="zone-details-heading">
            Hosted zone details
          </h2>
          <Link
            className="secondary-button"
            href={`/route53/hosted-zones/${encodeURIComponent(zone.id)}/records`}
          >
            Manage records
          </Link>
        </div>
        <p
          className="border-b border-[var(--border)] bg-[var(--surface-subtle)] px-5 py-2 text-xs text-[var(--muted)]"
        >
          Manage persisted record sets, including values and TTL, without
          publishing real DNS.
        </p>
        <dl className="details-grid">
          <div className="details-row">
            <dt>Hosted zone ID</dt>
            <dd className="flex items-center gap-2">
              <code>{zone.id}</code>
              <button
                aria-label="Copy hosted zone ID"
                className="copy-button"
                onClick={() => void copy(zone.id, "Hosted zone ID")}
                type="button"
              >
                <Copy aria-hidden="true" className="size-3.5" />
              </button>
            </dd>
          </div>
          <div className="details-row">
            <dt>Zone type</dt>
            <dd>{zone.zone_type === "PUBLIC" ? "Public" : "Private"}</dd>
          </div>
          <div className="details-row">
            <dt>Record count</dt>
            <dd>{zone.record_count}</dd>
          </div>
          <div className="details-row">
            <dt>Description</dt>
            <dd>{zone.comment || "—"}</dd>
          </div>
          <div className="details-row">
            <dt>Created</dt>
            <dd title={zone.created_at}>{formatDateTime(zone.created_at)}</dd>
          </div>
          <div className="details-row">
            <dt>Updated</dt>
            <dd title={zone.updated_at}>{formatDateTime(zone.updated_at)}</dd>
          </div>
        </dl>
      </section>

      <section
        aria-labelledby="name-servers-heading"
        className="surface-panel mt-4 overflow-hidden"
      >
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] px-5 py-3">
          <h2 className="text-base font-semibold" id="name-servers-heading">
            Name servers
          </h2>
          {zone.name_servers.length > 0 ? (
            <button
              className="secondary-button min-h-8 px-3 py-1"
              onClick={() =>
                void copy(zone.name_servers.join("\n"), "All name servers")
              }
              type="button"
            >
              <Copy aria-hidden="true" className="size-3.5" />
              Copy all
            </button>
          ) : null}
        </div>
        {zone.name_servers.length > 0 ? (
          <ul className="divide-y divide-[var(--border)]">
            {zone.name_servers.map((nameServer) => (
              <li
                className="flex items-center justify-between gap-3 px-5 py-2.5 text-sm"
                key={nameServer}
              >
                <code>{nameServer}</code>
                <button
                  aria-label={`Copy name server ${nameServer}`}
                  className="copy-button"
                  onClick={() => void copy(nameServer, "Name server")}
                  type="button"
                >
                  <Copy aria-hidden="true" className="size-3.5" />
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="px-5 py-4 text-sm text-[var(--muted)]">
            No public name servers are assigned to a private hosted zone.
          </p>
        )}
      </section>

      <EditCommentDialog
        onOpenChange={setEditOpen}
        open={editOpen}
        zone={zone}
      />
      <DeleteHostedZoneDialog
        onDeleted={() => router.push("/route53/hosted-zones")}
        onOpenChange={setDeleteOpen}
        open={deleteOpen}
        zone={zone}
      />
    </>
  );
}
