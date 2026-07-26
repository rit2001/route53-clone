import { apiRequest } from "@/lib/api/client";
import type {
  HostedZoneCreateInput,
  HostedZoneDetail,
  HostedZoneListParams,
  HostedZoneListResponse,
  HostedZoneUpdateInput,
} from "@/types/hosted-zone";

function appendOptional(
  searchParams: URLSearchParams,
  key: string,
  value: string | undefined,
): void {
  if (value?.trim()) {
    searchParams.set(key, value.trim());
  }
}

export function listHostedZones(
  params: HostedZoneListParams,
  accessToken: string,
): Promise<HostedZoneListResponse> {
  const searchParams = new URLSearchParams();
  appendOptional(searchParams, "search", params.search);
  appendOptional(searchParams, "zone_type", params.zone_type);
  searchParams.set("page", String(params.page));
  searchParams.set("page_size", String(params.page_size));
  searchParams.set("sort_by", params.sort_by);
  searchParams.set("sort_order", params.sort_order);

  return apiRequest<HostedZoneListResponse>(
    `/hosted-zones?${searchParams.toString()}`,
    { accessToken },
  );
}

export function createHostedZone(
  input: HostedZoneCreateInput,
  accessToken: string,
): Promise<HostedZoneDetail> {
  return apiRequest<HostedZoneDetail>("/hosted-zones", {
    method: "POST",
    accessToken,
    body: input,
  });
}

export function getHostedZone(
  zoneId: string,
  accessToken: string,
): Promise<HostedZoneDetail> {
  return apiRequest<HostedZoneDetail>(
    `/hosted-zones/${encodeURIComponent(zoneId)}`,
    { accessToken },
  );
}

export function updateHostedZone(
  zoneId: string,
  input: HostedZoneUpdateInput,
  accessToken: string,
): Promise<HostedZoneDetail> {
  return apiRequest<HostedZoneDetail>(
    `/hosted-zones/${encodeURIComponent(zoneId)}`,
    {
      method: "PATCH",
      accessToken,
      body: input,
    },
  );
}

export function deleteHostedZone(
  zoneId: string,
  accessToken: string,
): Promise<void> {
  return apiRequest<void>(`/hosted-zones/${encodeURIComponent(zoneId)}`, {
    method: "DELETE",
    accessToken,
  });
}
