"use client";

import { Plus, RefreshCw, Search, Trash2, X } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Spinner } from "@/components/ui/spinner";
import { DNS_RECORD_TYPES } from "@/lib/dns-records/list-state";
import type {
  DNSRecordListParams,
  DNSRecordType,
  RoutingPolicy,
} from "@/types/dns-record";

type DNSRecordsToolbarProps = Readonly<{
  params: DNSRecordListParams;
  isRefreshing: boolean;
  selectedCount: number;
  selectedSystemRecord: boolean;
  onCreate: () => void;
  onDeleteSelected: () => void;
  onRefresh: () => Promise<boolean>;
  onStateChange: (patch: Partial<DNSRecordListParams>) => void;
}>;

export function DNSRecordsToolbar({
  params,
  isRefreshing,
  selectedCount,
  selectedSystemRecord,
  onCreate,
  onDeleteSelected,
  onRefresh,
  onStateChange,
}: DNSRecordsToolbarProps) {
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
      toast.success("DNS records refreshed.");
    }
  }

  function clearSearch() {
    setSearch("");
    onStateChange({ search: undefined });
  }

  const deleteDisabled =
    selectedCount !== 1 || selectedSystemRecord || isRefreshing;
  const deleteExplanation =
    selectedCount > 1
      ? "Bulk deletion is not available."
      : selectedSystemRecord
        ? "System records cannot be deleted."
        : null;

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
              <Spinner label="Refreshing DNS records" />
            ) : (
              <RefreshCw aria-hidden="true" className="size-3.5" />
            )}
            Refresh
          </button>
          <button
            aria-describedby={
              deleteExplanation ? "record-delete-explanation" : undefined
            }
            className="secondary-button min-h-8 px-3 py-1"
            disabled={deleteDisabled}
            onClick={onDeleteSelected}
            type="button"
          >
            <Trash2 aria-hidden="true" className="size-3.5" />
            Delete record
          </button>
          {deleteExplanation ? (
            <span
              className="text-xs text-[var(--muted)]"
              id="record-delete-explanation"
            >
              {deleteExplanation}
            </span>
          ) : null}
        </div>
        <button
          className="primary-button min-h-8 px-3 py-1"
          onClick={onCreate}
          type="button"
        >
          <Plus aria-hidden="true" className="size-3.5" />
          Create record
        </button>
      </div>
      <div className="flex flex-wrap items-end gap-3 border-t border-[var(--border)] bg-[var(--surface-subtle)] px-3 py-2">
        <div className="min-w-64 flex-1 lg:max-w-md">
          <label className="sr-only" htmlFor="dns-record-search">
            Filter records by name or value
          </label>
          <div className="relative">
            <Search
              aria-hidden="true"
              className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-[var(--muted)]"
            />
            <input
              className="compact-input w-full pl-8 pr-8"
              id="dns-record-search"
              onChange={(event) => setSearch(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Escape") {
                  clearSearch();
                }
              }}
              placeholder="Filter records by name or value"
              type="search"
              value={search}
            />
            {search ? (
              <button
                aria-label="Clear DNS record search"
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
          Record type
          <select
            aria-label="Filter by record type"
            className="compact-select min-w-36"
            onChange={(event) =>
              onStateChange({
                record_type:
                  (event.target.value as DNSRecordType) || undefined,
              })
            }
            value={params.record_type ?? ""}
          >
            <option value="">All record types</option>
            {DNS_RECORD_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs font-semibold">
          Routing policy
          <select
            aria-label="Filter by routing policy"
            className="compact-select min-w-40"
            onChange={(event) =>
              onStateChange({
                routing_policy:
                  (event.target.value as RoutingPolicy) || undefined,
              })
            }
            value={params.routing_policy ?? ""}
          >
            <option value="">All routing policies</option>
            <option value="SIMPLE">Simple</option>
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs font-semibold">
          Alias
          <select
            aria-label="Filter by alias status"
            className="compact-select min-w-32"
            onChange={(event) =>
              onStateChange({
                alias:
                  event.target.value === ""
                    ? undefined
                    : event.target.value === "true",
              })
            }
            value={params.alias === undefined ? "" : String(params.alias)}
          >
            <option value="">All alias states</option>
            <option value="true">Alias</option>
            <option value="false">Non-alias</option>
          </select>
        </label>
        {params.search ||
        params.record_type ||
        params.routing_policy ||
        params.alias !== undefined ? (
          <button
            className="mb-0.5 text-xs font-semibold text-[var(--link)] hover:underline"
            onClick={() => {
              setSearch("");
              onStateChange({
                search: undefined,
                record_type: undefined,
                routing_policy: undefined,
                alias: undefined,
              });
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
