"use client";

import { useEffect, useMemo, useState } from "react";

import { ErrorAlert } from "@/components/feedback/error-alert";
import { DeleteHostedZoneDialog } from "@/components/hosted-zones/delete-hosted-zone-dialog";
import { HostedZoneEmptyState } from "@/components/hosted-zones/hosted-zone-empty-state";
import { HostedZoneTableSkeleton } from "@/components/hosted-zones/hosted-zone-table-skeleton";
import { HostedZonesTable } from "@/components/hosted-zones/hosted-zones-table";
import { HostedZonesToolbar } from "@/components/hosted-zones/hosted-zones-toolbar";
import { PaginationControls } from "@/components/hosted-zones/pagination-controls";
import { PageHeader } from "@/components/layout/page-header";
import { useHostedZoneListState } from "@/hooks/hosted-zones/use-hosted-zone-list-state";
import { useHostedZones } from "@/hooks/hosted-zones/queries";
import { getHostedZoneErrorMessage } from "@/lib/hosted-zones/errors";
import { hasHostedZoneFilters } from "@/lib/hosted-zones/list-state";
import type {
  HostedZoneListItem,
  HostedZoneSortField,
} from "@/types/hosted-zone";

type SelectionState = {
  scope: string;
  ids: Set<string>;
};

export function HostedZonesPageContent() {
  const { state, updateState } = useHostedZoneListState();
  const query = useHostedZones(state);
  const scope = JSON.stringify(state);
  const [selection, setSelection] = useState<SelectionState>({
    scope,
    ids: new Set(),
  });
  const [deleteZone, setDeleteZone] = useState<HostedZoneListItem | null>(null);
  if (selection.scope !== scope) {
    setSelection({ scope, ids: new Set() });
  }
  const selectedIds = useMemo(
    () => (selection.scope === scope ? selection.ids : new Set<string>()),
    [scope, selection],
  );
  const selectedZone = useMemo(
    () =>
      selectedIds.size === 1
        ? query.data?.items.find((zone) => selectedIds.has(zone.id)) ?? null
        : null,
    [query.data?.items, selectedIds],
  );

  useEffect(() => {
    const totalPages = query.data?.total_pages;
    if (
      totalPages !== undefined &&
      totalPages > 0 &&
      state.page > totalPages
    ) {
      updateState({ page: totalPages });
    }
  }, [query.data?.total_pages, state.page, updateState]);

  function setSelectedIds(ids: Set<string>) {
    setSelection({ scope, ids });
  }

  function sort(field: HostedZoneSortField) {
    updateState({
      sort_by: field,
      sort_order:
        state.sort_by === field && state.sort_order === "asc" ? "desc" : "asc",
    });
  }

  async function refresh(): Promise<boolean> {
    const result = await query.refetch();
    return !result.isError;
  }

  return (
    <>
      <PageHeader
        breadcrumbs={[
          { label: "Route 53", href: "/route53/dashboard" },
          { label: "Hosted zones" },
        ]}
        description="Create and manage persisted public and private DNS namespaces."
        secondary={
          query.data ? (
            <span className="text-xs text-[var(--muted)]">
              {query.data.total} hosted zone
              {query.data.total === 1 ? "" : "s"}
            </span>
          ) : undefined
        }
        title="Hosted zones"
      />
      <section
        aria-label="Hosted zone management"
        className="surface-panel overflow-hidden"
      >
        <HostedZonesToolbar
          isRefreshing={query.isFetching && !query.isPending}
          key={state.search ?? ""}
          onDeleteSelected={() => {
            if (selectedZone) {
              setDeleteZone(selectedZone);
            }
          }}
          onRefresh={refresh}
          onStateChange={updateState}
          params={state}
          selectedCount={selectedIds.size}
        />
        {query.isPending ? <HostedZoneTableSkeleton /> : null}
        {query.isError ? (
          <div className="border-t border-[var(--border)] p-5">
            <ErrorAlert
              message={getHostedZoneErrorMessage(query.error, "list")}
              onRetry={() => void query.refetch()}
              title="Unable to load hosted zones"
            />
          </div>
        ) : null}
        {query.data && query.data.items.length === 0 ? (
          <HostedZoneEmptyState
            filtered={hasHostedZoneFilters(state)}
            onClearFilters={() =>
              updateState({ search: undefined, zone_type: undefined })
            }
          />
        ) : null}
        {query.data && query.data.items.length > 0 ? (
          <>
            <HostedZonesTable
              items={query.data.items}
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
              total={query.data.total}
              totalPages={query.data.total_pages}
            />
          </>
        ) : null}
      </section>
      {deleteZone ? (
        <DeleteHostedZoneDialog
          onDeleted={() => {
            setSelectedIds(new Set());
            setDeleteZone(null);
          }}
          onOpenChange={(open) => {
            if (!open) {
              setDeleteZone(null);
            }
          }}
          open
          zone={deleteZone}
        />
      ) : null}
    </>
  );
}
