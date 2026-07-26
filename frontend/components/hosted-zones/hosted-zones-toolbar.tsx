"use client";

import { Plus, RefreshCw, Search, Trash2, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Spinner } from "@/components/ui/spinner";
import type {
  HostedZoneListParams,
  HostedZoneType,
} from "@/types/hosted-zone";

type HostedZonesToolbarProps = Readonly<{
  params: HostedZoneListParams;
  isRefreshing: boolean;
  selectedCount: number;
  onDeleteSelected: () => void;
  onRefresh: () => Promise<boolean>;
  onStateChange: (patch: Partial<HostedZoneListParams>) => void;
}>;

export function HostedZonesToolbar({
  params,
  isRefreshing,
  selectedCount,
  onDeleteSelected,
  onRefresh,
  onStateChange,
}: HostedZonesToolbarProps) {
  const [search, setSearch] = useState(params.search ?? "");

  useEffect(() => {
    const normalized = search.trim();
    if (normalized === (params.search ?? "")) {
      return;
    }
    const timer = window.setTimeout(() => {
      onStateChange({ search: normalized || undefined });
    }, 300);
    return () => window.clearTimeout(timer);
  }, [onStateChange, params.search, search]);

  async function refresh() {
    if (await onRefresh()) {
      toast.success("Hosted zones refreshed.");
    }
  }

  function clearSearch() {
    setSearch("");
    onStateChange({ search: undefined });
  }

  return (
    <div className="border-b border-[var(--border)]">
      <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2">
        <div className="flex flex-wrap items-center gap-2">
          <button
            className="secondary-button min-h-8 px-3 py-1"
            disabled={isRefreshing}
            onClick={() => void refresh()}
            type="button"
          >
            {isRefreshing ? (
              <Spinner label="Refreshing hosted zones" />
            ) : (
              <RefreshCw aria-hidden="true" className="size-3.5" />
            )}
            Refresh
          </button>
          <button
            aria-describedby={
              selectedCount > 1 ? "bulk-delete-explanation" : undefined
            }
            className="secondary-button min-h-8 px-3 py-1"
            disabled={selectedCount !== 1}
            onClick={onDeleteSelected}
            type="button"
          >
            <Trash2 aria-hidden="true" className="size-3.5" />
            Delete
          </button>
          {selectedCount > 1 ? (
            <span
              className="text-xs text-[var(--muted)]"
              id="bulk-delete-explanation"
            >
              Bulk deletion is not available.
            </span>
          ) : null}
        </div>
        <Link
          className="primary-button min-h-8 px-3 py-1 no-underline"
          href="/route53/hosted-zones/new"
        >
          <Plus aria-hidden="true" className="size-3.5" />
          Create hosted zone
        </Link>
      </div>
      <div className="flex flex-wrap items-end gap-3 border-t border-[var(--border)] bg-[var(--surface-subtle)] px-3 py-2">
        <div className="min-w-56 flex-1 sm:max-w-sm">
          <label className="sr-only" htmlFor="hosted-zone-search">
            Search hosted zones
          </label>
          <div className="relative">
            <Search
              aria-hidden="true"
              className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-[var(--muted)]"
            />
            <input
              className="compact-input w-full pl-8 pr-8"
              id="hosted-zone-search"
              onChange={(event) => setSearch(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Escape") {
                  clearSearch();
                }
              }}
              placeholder="Search hosted zones"
              type="search"
              value={search}
            />
            {search ? (
              <button
                aria-label="Clear hosted zone search"
                className="absolute right-1 top-1/2 inline-flex size-7 -translate-y-1/2 items-center justify-center text-[var(--muted)]"
                onClick={clearSearch}
                type="button"
              >
                <X aria-hidden="true" className="size-3.5" />
              </button>
            ) : null}
          </div>
        </div>
        <label className="flex flex-col gap-1 text-xs font-semibold">
          Zone type
          <select
            aria-label="Filter by zone type"
            className="compact-select min-w-32"
            onChange={(event) =>
              onStateChange({
                zone_type:
                  (event.target.value as HostedZoneType) || undefined,
              })
            }
            value={params.zone_type ?? ""}
          >
            <option value="">All types</option>
            <option value="PUBLIC">Public</option>
            <option value="PRIVATE">Private</option>
          </select>
        </label>
        {params.search || params.zone_type ? (
          <button
            className="mb-0.5 text-xs font-semibold text-[var(--link)] hover:underline"
            onClick={() => {
              setSearch("");
              onStateChange({ search: undefined, zone_type: undefined });
            }}
            type="button"
          >
            Clear filters
          </button>
        ) : null}
      </div>
    </div>
  );
}
