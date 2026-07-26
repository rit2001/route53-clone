"use client";

import { ArrowLeft, Info } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { DeleteRecordDialog } from "@/components/dns-records/delete-record-dialog";
import { DNSRecordForm } from "@/components/dns-records/dns-record-form";
import { DNSRecordsTable } from "@/components/dns-records/dns-records-table";
import { DNSRecordsToolbar } from "@/components/dns-records/dns-records-toolbar";
import { RecordsEmptyState } from "@/components/dns-records/records-empty-state";
import { RecordsTableSkeleton } from "@/components/dns-records/records-table-skeleton";
import { ZoneTypeBadge } from "@/components/hosted-zones/zone-type-badge";
import { PaginationControls } from "@/components/hosted-zones/pagination-controls";
import { ErrorAlert } from "@/components/feedback/error-alert";
import { PageHeader } from "@/components/layout/page-header";
import { useDNSRecords } from "@/hooks/dns-records/queries";
import { useDNSRecordListState } from "@/hooks/dns-records/use-dns-record-list-state";
import { useHostedZone } from "@/hooks/hosted-zones/queries";
import { isApiError } from "@/lib/api/errors";
import { getDNSRecordErrorMessage } from "@/lib/dns-records/errors";
import { hasDNSRecordFilters } from "@/lib/dns-records/list-state";
import type {
  DNSRecord,
  DNSRecordSortField,
} from "@/types/dns-record";

type SelectionState = {
  scope: string;
  ids: Set<string>;
};

export function DNSRecordsPage({ zoneId }: Readonly<{ zoneId: string }>) {
  const { state, updateState } = useDNSRecordListState();
  const zoneQuery = useHostedZone(zoneId);
  const recordsQuery = useDNSRecords(zoneId, state);
  const scope = JSON.stringify(state);
  const [selection, setSelection] = useState<SelectionState>({
    scope,
    ids: new Set(),
  });
  const [createOpen, setCreateOpen] = useState(false);
  const [editRecord, setEditRecord] = useState<DNSRecord | null>(null);
  const [deleteRecord, setDeleteRecord] = useState<DNSRecord | null>(null);
  if (selection.scope !== scope) {
    setSelection({ scope, ids: new Set() });
  }
  const selectedIds = useMemo(
    () => (selection.scope === scope ? selection.ids : new Set<string>()),
    [scope, selection],
  );
  const selectedRecord = useMemo(
    () =>
      selectedIds.size === 1
        ? recordsQuery.data?.items.find((record) =>
            selectedIds.has(record.id),
          ) ?? null
        : null,
    [recordsQuery.data?.items, selectedIds],
  );

  useEffect(() => {
    const totalPages = recordsQuery.data?.total_pages;
    if (
      totalPages !== undefined &&
      totalPages > 0 &&
      state.page > totalPages
    ) {
      updateState({ page: totalPages });
    }
  }, [recordsQuery.data?.total_pages, state.page, updateState]);

  function setSelectedIds(ids: Set<string>) {
    setSelection({ scope, ids });
  }

  function sort(field: DNSRecordSortField) {
    updateState({
      sort_by: field,
      sort_order:
        state.sort_by === field && state.sort_order === "asc" ? "desc" : "asc",
    });
  }

  async function refresh(): Promise<boolean> {
    const [zoneResult, recordsResult] = await Promise.all([
      zoneQuery.refetch(),
      recordsQuery.refetch(),
    ]);
    return !zoneResult.isError && !recordsResult.isError;
  }

  const notFound =
    (zoneQuery.isError &&
      isApiError(zoneQuery.error) &&
      zoneQuery.error.code === "HOSTED_ZONE_NOT_FOUND") ||
    (recordsQuery.isError &&
      isApiError(recordsQuery.error) &&
      recordsQuery.error.code === "HOSTED_ZONE_NOT_FOUND");

  if (notFound) {
    return (
      <>
        <PageHeader
          breadcrumbs={[
            { label: "Route 53", href: "/route53/dashboard" },
            { label: "Hosted zones", href: "/route53/hosted-zones" },
            { label: "Not found" },
            { label: "Records" },
          ]}
          title="Hosted zone not found"
        />
        <section className="surface-panel p-5">
          <p className="text-sm text-[var(--muted)]">
            The hosted zone may have been deleted or is not available to this
            account.
          </p>
          <Link
            className="secondary-button mt-4"
            href="/route53/hosted-zones"
          >
            Return to hosted zones
          </Link>
        </section>
      </>
    );
  }

  if (zoneQuery.isPending) {
    return (
      <>
        <PageHeader title="DNS records" />
        <section className="surface-panel overflow-hidden">
          <RecordsTableSkeleton />
        </section>
      </>
    );
  }

  if (zoneQuery.isError || !zoneQuery.data) {
    return (
      <>
        <PageHeader title="DNS records" />
        <ErrorAlert
          message="Unable to load the hosted zone. Check the API connection and try again."
          onRetry={() => void zoneQuery.refetch()}
          title="Unable to load hosted zone"
        />
      </>
    );
  }

  const zone = zoneQuery.data;
  return (
    <>
      <PageHeader
        actions={
          <Link
            className="secondary-button"
            href={`/route53/hosted-zones/${encodeURIComponent(zone.id)}`}
          >
            <ArrowLeft aria-hidden="true" className="size-4" />
            Hosted zone details
          </Link>
        }
        breadcrumbs={[
          { label: "Route 53", href: "/route53/dashboard" },
          { label: "Hosted zones", href: "/route53/hosted-zones" },
          {
            label: zone.name,
            href: `/route53/hosted-zones/${encodeURIComponent(zone.id)}`,
          },
          { label: "Records" },
        ]}
        description="Manage persisted DNS record sets for this hosted zone."
        secondary={
          <div className="flex flex-wrap items-center gap-3 text-xs text-[var(--muted)]">
            <ZoneTypeBadge type={zone.zone_type} />
            <span>
              Hosted zone ID: <code>{zone.id}</code>
            </span>
            <span>
              {zone.record_count} record set
              {zone.record_count === 1 ? "" : "s"}
            </span>
          </div>
        }
        title={`Records for ${zone.name}`}
      />
      <div
        className="mb-4 flex items-start gap-2 rounded-[var(--radius-sm)] border border-[var(--info-border)] bg-[var(--info-soft)] p-3 text-sm"
        role="note"
      >
        <Info
          aria-hidden="true"
          className="mt-0.5 size-4 shrink-0 text-[var(--link)]"
        />
        Records are persisted by this clone but do not provide real DNS
        resolution.
      </div>
      <section
        aria-label="DNS record management"
        className="surface-panel overflow-hidden"
      >
        <DNSRecordsToolbar
          isRefreshing={recordsQuery.isFetching && !recordsQuery.isPending}
          key={state.search ?? ""}
          onCreate={() => setCreateOpen(true)}
          onDeleteSelected={() => {
            if (selectedRecord && !selectedRecord.is_system) {
              setDeleteRecord(selectedRecord);
            }
          }}
          onRefresh={refresh}
          onStateChange={updateState}
          params={state}
          selectedCount={selectedIds.size}
          selectedSystemRecord={Boolean(selectedRecord?.is_system)}
        />
        {recordsQuery.isPending ? <RecordsTableSkeleton /> : null}
        {recordsQuery.isError ? (
          <div className="border-t border-[var(--border)] p-5">
            <ErrorAlert
              message={getDNSRecordErrorMessage(recordsQuery.error, "list")}
              onRetry={() => void recordsQuery.refetch()}
              title="Unable to load DNS records"
            />
          </div>
        ) : null}
        {recordsQuery.data && recordsQuery.data.items.length === 0 ? (
          <RecordsEmptyState
            filtered={hasDNSRecordFilters(state)}
            onClearFilters={() =>
              updateState({
                search: undefined,
                record_type: undefined,
                routing_policy: undefined,
                alias: undefined,
              })
            }
            onCreate={() => setCreateOpen(true)}
          />
        ) : null}
        {recordsQuery.data && recordsQuery.data.items.length > 0 ? (
          <>
            <DNSRecordsTable
              items={recordsQuery.data.items}
              onDelete={setDeleteRecord}
              onEdit={setEditRecord}
              onSelectionChange={setSelectedIds}
              onSort={sort}
              selectedIds={selectedIds}
              sortBy={state.sort_by}
              sortOrder={state.sort_order}
            />
            <PaginationControls
              onPageChange={(page) => updateState({ page })}
              onPageSizeChange={(pageSize) =>
                updateState({ page_size: pageSize })
              }
              page={state.page}
              pageSize={state.page_size}
              total={recordsQuery.data.total}
              totalPages={recordsQuery.data.total_pages}
            />
          </>
        ) : null}
      </section>

      {createOpen ? (
        <DNSRecordForm
          onOpenChange={setCreateOpen}
          open
          zoneId={zone.id}
          zoneName={zone.name}
        />
      ) : null}
      {editRecord ? (
        <DNSRecordForm
          onOpenChange={(open) => {
            if (!open) {
              setEditRecord(null);
            }
          }}
          open
          record={editRecord}
          zoneId={zone.id}
          zoneName={zone.name}
        />
      ) : null}
      {deleteRecord ? (
        <DeleteRecordDialog
          onDeleted={() => {
            setSelectedIds(new Set());
            setDeleteRecord(null);
          }}
          onOpenChange={(open) => {
            if (!open) {
              setDeleteRecord(null);
            }
          }}
          open
          record={deleteRecord}
          zoneId={zone.id}
        />
      ) : null}
    </>
  );
}
