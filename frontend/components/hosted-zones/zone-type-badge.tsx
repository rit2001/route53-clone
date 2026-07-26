import type { HostedZoneType } from "@/types/hosted-zone";

type ZoneTypeBadgeProps = Readonly<{
  type: HostedZoneType;
}>;

export function ZoneTypeBadge({ type }: ZoneTypeBadgeProps) {
  return (
    <span className="status-badge">
      {type === "PUBLIC" ? "Public" : "Private"}
    </span>
  );
}
