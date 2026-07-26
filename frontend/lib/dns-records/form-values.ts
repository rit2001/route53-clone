import type { CreatableDNSRecordType } from "@/types/dns-record";

export const CREATABLE_DNS_RECORD_TYPES: readonly CreatableDNSRecordType[] = [
  "A",
  "AAAA",
  "CNAME",
  "TXT",
  "MX",
  "NS",
  "PTR",
  "SRV",
  "CAA",
];

export const RECORD_TYPE_HELP: Record<
  CreatableDNSRecordType,
  { guidance: string; example: string }
> = {
  A: { guidance: "One IPv4 address per line", example: "192.0.2.10" },
  AAAA: { guidance: "One IPv6 address per line", example: "2001:db8::10" },
  CNAME: {
    guidance: "Exactly one hostname",
    example: "target.example.net.",
  },
  TXT: {
    guidance: "One text value per line",
    example: '"verification=value"',
  },
  MX: {
    guidance: "Priority followed by mail server",
    example: "10 mail.example.com.",
  },
  NS: {
    guidance: "One name server per line",
    example: "ns1.example.net.",
  },
  PTR: {
    guidance: "One hostname per line",
    example: "host.example.com.",
  },
  SRV: {
    guidance: "Priority weight port target",
    example: "10 5 443 service.example.com.",
  },
  CAA: {
    guidance: "Flags tag quoted value",
    example: '0 issue "letsencrypt.org"',
  },
};

export function parseRecordValues(value: string): string[] {
  const seen = new Set<string>();
  const values: string[] = [];
  for (const line of value.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (trimmed && !seen.has(trimmed)) {
      seen.add(trimmed);
      values.push(trimmed);
    }
  }
  return values;
}
