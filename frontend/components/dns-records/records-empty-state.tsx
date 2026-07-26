import { FilePlus2 } from "lucide-react";

export function RecordsEmptyState({
  filtered,
  onClearFilters,
  onCreate,
}: Readonly<{
  filtered: boolean;
  onClearFilters: () => void;
  onCreate: () => void;
}>) {
  return (
    <div className="border-t border-[var(--border)] px-5 py-12 text-center">
      <FilePlus2
        aria-hidden="true"
        className="mx-auto size-7 text-[var(--muted)]"
      />
      <h2 className="mt-3 text-base font-semibold">
        {filtered ? "No DNS records match the current filters." : "No DNS records"}
      </h2>
      <p className="mx-auto mt-1 max-w-md text-sm text-[var(--muted)]">
        {filtered
          ? "Adjust or clear the filters to see other record sets."
          : "Create a DNS record set for this hosted zone."}
      </p>
      <button
        className={filtered ? "secondary-button mt-4" : "primary-button mt-4"}
        onClick={filtered ? onClearFilters : onCreate}
        type="button"
      >
        {filtered ? "Clear filters" : "Create record"}
      </button>
    </div>
  );
}
