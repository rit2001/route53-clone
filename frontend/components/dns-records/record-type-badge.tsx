import type { DNSRecordType } from "@/types/dns-record";

export function RecordTypeBadge({
  isSystem,
  type,
}: Readonly<{ isSystem: boolean; type: DNSRecordType }>) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="status-badge normal-case tracking-normal">{type}</span>
      {isSystem ? (
        <span
          className="text-[0.6875rem] font-semibold text-[var(--muted)]"
          title="System-generated NS and SOA records cannot be modified."
        >
          System
        </span>
      ) : null}
    </span>
  );
}
