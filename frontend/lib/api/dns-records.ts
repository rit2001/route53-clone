import { apiRequest } from "@/lib/api/client";
import type {
  DNSRecord,
  DNSRecordCreateInput,
  DNSRecordListParams,
  DNSRecordListResponse,
  DNSRecordUpdateInput,
} from "@/types/dns-record";

function recordsPath(zoneId: string): string {
  return `/hosted-zones/${encodeURIComponent(zoneId)}/records`;
}

function appendOptional(
  searchParams: URLSearchParams,
  key: string,
  value: string | undefined,
): void {
  if (value?.trim()) {
    searchParams.set(key, value.trim());
  }
}

export function listDNSRecords(
  zoneId: string,
  params: DNSRecordListParams,
  accessToken: string,
): Promise<DNSRecordListResponse> {
  const searchParams = new URLSearchParams();
  appendOptional(searchParams, "search", params.search);
  appendOptional(searchParams, "record_type", params.record_type);
  appendOptional(searchParams, "routing_policy", params.routing_policy);
  if (params.alias !== undefined) {
    searchParams.set("alias", String(params.alias));
  }
  searchParams.set("page", String(params.page));
  searchParams.set("page_size", String(params.page_size));
  searchParams.set("sort_by", params.sort_by);
  searchParams.set("sort_order", params.sort_order);

  return apiRequest<DNSRecordListResponse>(
    `${recordsPath(zoneId)}?${searchParams.toString()}`,
    { accessToken },
  );
}

export function createDNSRecord(
  zoneId: string,
  input: DNSRecordCreateInput,
  accessToken: string,
): Promise<DNSRecord> {
  return apiRequest<DNSRecord>(recordsPath(zoneId), {
    method: "POST",
    accessToken,
    body: input,
  });
}

export function getDNSRecord(
  zoneId: string,
  recordId: string,
  accessToken: string,
): Promise<DNSRecord> {
  return apiRequest<DNSRecord>(
    `${recordsPath(zoneId)}/${encodeURIComponent(recordId)}`,
    { accessToken },
  );
}

export function updateDNSRecord(
  zoneId: string,
  recordId: string,
  input: DNSRecordUpdateInput,
  accessToken: string,
): Promise<DNSRecord> {
  return apiRequest<DNSRecord>(
    `${recordsPath(zoneId)}/${encodeURIComponent(recordId)}`,
    {
      method: "PATCH",
      accessToken,
      body: input,
    },
  );
}

export function deleteDNSRecord(
  zoneId: string,
  recordId: string,
  accessToken: string,
): Promise<void> {
  return apiRequest<void>(
    `${recordsPath(zoneId)}/${encodeURIComponent(recordId)}`,
    {
      method: "DELETE",
      accessToken,
    },
  );
}
