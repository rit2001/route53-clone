"use client";

import { ArrowDown, ArrowUp, ArrowUpDown, Copy } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

import { ZoneTypeBadge } from "@/components/hosted-zones/zone-type-badge";
import { copyText } from "@/lib/utilities/clipboard";
import { formatDateTime } from "@/lib/utilities/date";
import type {
  HostedZoneListItem,
  HostedZoneSortField,
  SortOrder,
} from "@/types/hosted-zone";

type HostedZonesTableProps = Readonly<{
  items: HostedZoneListItem[];
  selectedIds: ReadonlySet<string>;
  sortBy: HostedZoneSortField;
  sortOrder: SortOrder;
  onSelectionChange: (ids: Set<string>) => void;
  onSort: (field: HostedZoneSortField) => void;
}>;

type SortHeaderProps = Readonly<{
  field: HostedZoneSortField;
  label: string;
  sortBy: HostedZoneSortField;
  sortOrder: SortOrder;
  onSort: (field: HostedZoneSortField) => void;
}>;

function SortHeader({
  field,
  label,
  sortBy,
  sortOrder,
  onSort,
}: SortHeaderProps) {
  const active = sortBy === field;
  const ariaSort = active
    ? sortOrder === "asc"
      ? "ascending"
      : "descending"
    : "none";
  const Icon = !active ? ArrowUpDown : sortOrder === "asc" ? ArrowUp : ArrowDown;

  return (
    <th aria-sort={ariaSort} className="table-heading" scope="col">
      <button
        className="flex w-full items-center gap-1 text-left hover:text-[var(--link)]"
        onClick={() => onSort(field)}
        type="button"
      >
        {label}
        <Icon aria-hidden="true" className="size-3.5" />
      </button>
    </th>
  );
}

export function HostedZonesTable({
  items,
  selectedIds,
  sortBy,
  sortOrder,
  onSelectionChange,
  onSort,
}: HostedZonesTableProps) {
  const allSelected =
    items.length > 0 && items.every((zone) => selectedIds.has(zone.id));
  const partiallySelected =
    !allSelected && items.some((zone) => selectedIds.has(zone.id));

  function toggleAll() {
    onSelectionChange(allSelected ? new Set() : new Set(items.map((zone) => zone.id)));
  }

  function toggleOne(zoneId: string) {
    const next = new Set(selectedIds);
    if (next.has(zoneId)) {
      next.delete(zoneId);
    } else {
      next.add(zoneId);
    }
    onSelectionChange(next);
  }

  async function copyZoneId(zoneId: string) {
    if (await copyText(zoneId)) {
      toast.success("Hosted zone ID copied.");
    } else {
      toast.error("Unable to copy the hosted zone ID.");
    }
  }

  return (
    <div
      aria-label="Hosted zones table"
      className="overflow-x-auto border-t border-[var(--border)]"
      role="region"
      tabIndex={0}
    >
      <table className="w-full min-w-[76rem] border-collapse text-left text-xs">
        <caption className="sr-only">
          Hosted zones owned by the current mock account
        </caption>
        <thead className="bg-[var(--surface-subtle)]">
          <tr>
            <th className="w-10 table-heading text-center" scope="col">
              <input
                aria-label="Select all hosted zones on this page"
                checked={allSelected}
                ref={(input) => {
                  if (input) {
                    input.indeterminate = partiallySelected;
                  }
                }}
                onChange={toggleAll}
                type="checkbox"
              />
            </th>
            <SortHeader
              field="name"
              label="Hosted zone name"
              onSort={onSort}
              sortBy={sortBy}
              sortOrder={sortOrder}
            />
            <SortHeader
              field="zone_type"
              label="Type"
              onSort={onSort}
              sortBy={sortBy}
              sortOrder={sortOrder}
            />
            <th className="table-heading text-right" scope="col">
              Record count
            </th>
            <th className="table-heading" scope="col">
              Description
            </th>
            <th className="table-heading" scope="col">
              Hosted zone ID
            </th>
            <SortHeader
              field="created_at"
              label="Created"
              onSort={onSort}
              sortBy={sortBy}
              sortOrder={sortOrder}
            />
          </tr>
        </thead>
        <tbody>
          {items.map((zone) => {
            const selected = selectedIds.has(zone.id);
            return (
              <tr
                className={`border-t border-[var(--border)] hover:bg-[var(--surface-subtle)] ${
                  selected ? "bg-[var(--info-soft)]" : "bg-[var(--surface)]"
                }`}
                key={zone.id}
              >
                <td className="table-cell text-center">
                  <input
                    aria-label={`Select hosted zone ${zone.name}`}
                    checked={selected}
                    onChange={() => toggleOne(zone.id)}
                    type="checkbox"
                  />
                </td>
                <td className="table-cell font-medium">
                  <Link
                    className="hover:underline"
                    href={`/route53/hosted-zones/${encodeURIComponent(zone.id)}`}
                  >
                    {zone.name}
                  </Link>
                </td>
                <td className="table-cell">
                  <ZoneTypeBadge type={zone.zone_type} />
                </td>
                <td className="table-cell text-right tabular-nums">
                  {zone.record_count}
                </td>
                <td
                  className="table-cell max-w-64 truncate"
                  title={zone.comment ?? undefined}
                >
                  {zone.comment || "—"}
                </td>
                <td className="table-cell">
                  <span className="inline-flex items-center gap-1.5">
                    <code className="text-[0.6875rem]">{zone.id}</code>
                    <button
                      aria-label={`Copy hosted zone ID ${zone.id}`}
                      className="copy-button"
                      onClick={() => void copyZoneId(zone.id)}
                      type="button"
                    >
                      <Copy aria-hidden="true" className="size-3.5" />
                    </button>
                  </span>
                </td>
                <td
                  className="table-cell whitespace-nowrap"
                  title={zone.created_at}
                >
                  {formatDateTime(zone.created_at)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
