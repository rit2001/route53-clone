import { Globe2, SearchX } from "lucide-react";
import Link from "next/link";

type HostedZoneEmptyStateProps = Readonly<{
  filtered: boolean;
  onClearFilters: () => void;
}>;

export function HostedZoneEmptyState({
  filtered,
  onClearFilters,
}: HostedZoneEmptyStateProps) {
  const Icon = filtered ? SearchX : Globe2;
  return (
    <div className="border-t border-[var(--border)] px-5 py-10 text-center">
      <Icon
        aria-hidden="true"
        className="mx-auto size-7 text-[var(--muted)]"
      />
      <h2 className="mt-3 text-base font-semibold">
        {filtered
          ? "No hosted zones match the current filters."
          : "No hosted zones"}
      </h2>
      <p className="mx-auto mt-1 max-w-lg text-sm text-[var(--muted)]">
        {filtered
          ? "Adjust or clear the search and type filter to see more results."
          : "Create a hosted zone to begin managing DNS record sets."}
      </p>
      {filtered ? (
        <button
          className="secondary-button mt-4"
          onClick={onClearFilters}
          type="button"
        >
          Clear filters
        </button>
      ) : (
        <Link className="primary-button mt-4 no-underline" href="/route53/hosted-zones/new">
          Create hosted zone
        </Link>
      )}
    </div>
  );
}
