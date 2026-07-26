export function RecordsTableSkeleton() {
  return (
    <div aria-label="Loading DNS records" aria-live="polite" role="status">
      <span className="sr-only">Loading DNS records</span>
      <div className="border-t border-[var(--border)]">
        {Array.from({ length: 6 }, (_, index) => (
          <div
            className="grid min-h-12 grid-cols-[2rem_2fr_0.6fr_0.8fr_0.5fr_3fr_0.6fr] items-center gap-3 border-b border-[var(--border)] px-3"
            key={index}
          >
            {Array.from({ length: 7 }, (__, cell) => (
              <span
                className="h-3 rounded-sm bg-[var(--nav-active)]"
                key={cell}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
