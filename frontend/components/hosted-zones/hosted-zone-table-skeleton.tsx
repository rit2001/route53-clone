export function HostedZoneTableSkeleton() {
  return (
    <div
      aria-label="Loading hosted zones"
      className="overflow-hidden border-t border-[var(--border)]"
      role="status"
    >
      <div className="h-9 bg-[var(--surface-subtle)]" />
      {Array.from({ length: 6 }, (_, index) => (
        <div
          className="grid h-12 grid-cols-[2rem_2fr_5rem_5rem_2fr] items-center gap-3 border-t border-[var(--border)] px-3"
          key={index}
        >
          {Array.from({ length: 5 }, (__, cell) => (
            <span
              className="h-3 rounded-sm bg-[#e3e7e8] motion-safe:animate-pulse"
              key={cell}
            />
          ))}
        </div>
      ))}
      <span className="sr-only">Loading hosted zones…</span>
    </div>
  );
}
