"use client";

import { ArrowDown, ArrowUp, ArrowUpDown, Copy, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { RecordTypeBadge } from "@/components/dns-records/record-type-badge";
import { RecordValuesCell } from "@/components/dns-records/record-values-cell";
import { copyText } from "@/lib/utilities/clipboard";
import type {
  DNSRecord,
  DNSRecordSortField,
  SortOrder,
} from "@/types/dns-record";

type SortHeaderProps = Readonly<{
  field: DNSRecordSortField;
  label: string;
  sortBy: DNSRecordSortField;
  sortOrder: SortOrder;
  onSort: (field: DNSRecordSortField) => void;
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

export function DNSRecordsTable({
  items,
  selectedIds,
  sortBy,
  sortOrder,
  onDelete,
  onEdit,
  onSelectionChange,
  onSort,
}: Readonly<{
  items: DNSRecord[];
  selectedIds: ReadonlySet<string>;
  sortBy: DNSRecordSortField;
  sortOrder: SortOrder;
  onDelete: (record: DNSRecord) => void;
  onEdit: (record: DNSRecord) => void;
  onSelectionChange: (ids: Set<string>) => void;
  onSort: (field: DNSRecordSortField) => void;
}>) {
  const selectable = items.filter((record) => !record.is_system);
  const allSelected =
    selectable.length > 0 &&
    selectable.every((record) => selectedIds.has(record.id));
  const partiallySelected =
    !allSelected && selectable.some((record) => selectedIds.has(record.id));

  function toggleAll() {
    onSelectionChange(
      allSelected ? new Set() : new Set(selectable.map((record) => record.id)),
    );
  }

  function toggleOne(recordId: string) {
    const next = new Set(selectedIds);
    if (next.has(recordId)) {
      next.delete(recordId);
    } else {
      next.add(recordId);
    }
    onSelectionChange(next);
  }

  async function copyName(name: string) {
    if (await copyText(name)) {
      toast.success("Record name copied.");
    } else {
      toast.error("Unable to copy the record name.");
    }
  }

  return (
    <div
      aria-label="DNS records table"
      className="overflow-x-auto border-t border-[var(--border)]"
      role="region"
      tabIndex={0}
    >
      <table className="w-full min-w-[82rem] border-collapse text-left text-xs">
        <caption className="sr-only">
          DNS record sets in the current hosted zone
        </caption>
        <thead className="bg-[var(--surface-subtle)]">
          <tr>
            <th className="w-10 table-heading text-center" scope="col">
              <input
                aria-label="Select all user-managed DNS records on this page"
                checked={allSelected}
                disabled={selectable.length === 0}
                onChange={toggleAll}
                ref={(input) => {
                  if (input) {
                    input.indeterminate = partiallySelected;
                  }
                }}
                type="checkbox"
              />
            </th>
            <SortHeader
              field="name"
              label="Record name"
              onSort={onSort}
              sortBy={sortBy}
              sortOrder={sortOrder}
            />
            <SortHeader
              field="record_type"
              label="Type"
              onSort={onSort}
              sortBy={sortBy}
              sortOrder={sortOrder}
            />
            <th className="table-heading" scope="col">
              Routing policy
            </th>
            <th className="table-heading" scope="col">
              Alias
            </th>
            <th className="table-heading" scope="col">
              Value / Route traffic to
            </th>
            <SortHeader
              field="ttl"
              label="TTL"
              onSort={onSort}
              sortBy={sortBy}
              sortOrder={sortOrder}
            />
            <th className="table-heading" scope="col">
              Actions
            </th>
          </tr>
        </thead>
        <tbody>
          {items.map((record) => {
            const selected = selectedIds.has(record.id);
            return (
              <tr
                className={`border-t border-[var(--border)] hover:bg-[var(--surface-subtle)] ${
                  selected ? "bg-[var(--info-soft)]" : "bg-[var(--surface)]"
                }`}
                key={record.id}
              >
                <td className="table-cell text-center">
                  <input
                    aria-describedby={
                      record.is_system ? `system-${record.id}` : undefined
                    }
                    aria-label={`Select ${record.record_type} record ${record.name}`}
                    checked={selected}
                    disabled={record.is_system}
                    onChange={() => toggleOne(record.id)}
                    type="checkbox"
                  />
                  {record.is_system ? (
                    <span className="sr-only" id={`system-${record.id}`}>
                      System-generated records cannot be modified.
                    </span>
                  ) : null}
                </td>
                <td className="table-cell max-w-64">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="break-all font-medium">{record.name}</span>
                    <button
                      aria-label={`Copy record name ${record.name}`}
                      className="copy-button shrink-0"
                      onClick={() => void copyName(record.name)}
                      type="button"
                    >
                      <Copy aria-hidden="true" className="size-3.5" />
                    </button>
                  </span>
                </td>
                <td className="table-cell">
                  <RecordTypeBadge
                    isSystem={record.is_system}
                    type={record.record_type}
                  />
                </td>
                <td className="table-cell">Simple</td>
                <td className="table-cell">{record.alias ? "Yes" : "No"}</td>
                <td className="table-cell max-w-[32rem]">
                  <RecordValuesCell
                    name={record.name}
                    values={record.values}
                  />
                </td>
                <td className="table-cell text-right tabular-nums">
                  {record.ttl}
                </td>
                <td className="table-cell">
                  {record.is_system ? (
                    <span
                      className="text-xs text-[var(--muted)]"
                      title="System-generated NS and SOA records cannot be modified."
                    >
                      System managed
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1">
                      <button
                        aria-label={`Edit ${record.record_type} record ${record.name}`}
                        className="copy-button gap-1 px-1.5"
                        onClick={() => onEdit(record)}
                        type="button"
                      >
                        <Pencil aria-hidden="true" className="size-3.5" />
                        Edit
                      </button>
                      <button
                        aria-label={`Delete ${record.record_type} record ${record.name}`}
                        className="copy-button gap-1 px-1.5 text-[var(--danger)]"
                        onClick={() => onDelete(record)}
                        type="button"
                      >
                        <Trash2 aria-hidden="true" className="size-3.5" />
                        Delete
                      </button>
                    </span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
