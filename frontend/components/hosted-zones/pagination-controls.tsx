import { ChevronLeft, ChevronRight } from "lucide-react";

import { HOSTED_ZONE_PAGE_SIZES } from "@/lib/hosted-zones/list-state";

type PaginationControlsProps = Readonly<{
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
}>;

export function PaginationControls({
  page,
  pageSize,
  total,
  totalPages,
  onPageChange,
  onPageSizeChange,
}: PaginationControlsProps) {
  const first = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const last = total === 0 ? 0 : Math.min(page * pageSize, total);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--border)] bg-[var(--surface-subtle)] px-3 py-2 text-xs">
      <span aria-live="polite">
        {first}–{last} of {total}
      </span>
      <div className="flex items-center gap-3">
        <label className="flex items-center gap-2">
          <span>Rows per page</span>
          <select
            aria-label="Rows per page"
            className="compact-select"
            onChange={(event) => onPageSizeChange(Number(event.target.value))}
            value={pageSize}
          >
            {HOSTED_ZONE_PAGE_SIZES.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </label>
        <span>
          Page {page} of {Math.max(totalPages, 1)}
        </span>
        <div className="flex">
          <button
            aria-label="Previous page"
            className="icon-button rounded-r-none"
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
            type="button"
          >
            <ChevronLeft aria-hidden="true" className="size-4" />
          </button>
          <button
            aria-label="Next page"
            className="icon-button rounded-l-none border-l-0"
            disabled={totalPages === 0 || page >= totalPages}
            onClick={() => onPageChange(page + 1)}
            type="button"
          >
            <ChevronRight aria-hidden="true" className="size-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
