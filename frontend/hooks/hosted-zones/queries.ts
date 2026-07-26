"use client";

import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import { useAuth } from "@/components/auth/auth-provider";
import {
  createHostedZone,
  deleteHostedZone,
  getHostedZone,
  listHostedZones,
  updateHostedZone,
} from "@/lib/api/hosted-zones";
import { ApiError } from "@/lib/api/errors";
import type {
  HostedZoneCreateInput,
  HostedZoneListParams,
  HostedZoneUpdateInput,
} from "@/types/hosted-zone";

export const hostedZoneKeys = {
  all: ["hosted-zones"] as const,
  list: (params: HostedZoneListParams) =>
    ["hosted-zones", params] as const,
  detail: (zoneId: string) => ["hosted-zone", zoneId] as const,
};

function shouldRetry(failureCount: number, error: Error): boolean {
  if (error instanceof ApiError && [401, 404, 422].includes(error.status)) {
    return false;
  }
  return failureCount < 1;
}

export function useHostedZones(params: HostedZoneListParams) {
  const { accessToken } = useAuth();
  return useQuery({
    queryKey: hostedZoneKeys.list(params),
    queryFn: () => listHostedZones(params, accessToken as string),
    enabled: Boolean(accessToken),
    placeholderData: keepPreviousData,
    retry: shouldRetry,
  });
}

export function useHostedZone(zoneId: string) {
  const { accessToken } = useAuth();
  return useQuery({
    queryKey: hostedZoneKeys.detail(zoneId),
    queryFn: () => getHostedZone(zoneId, accessToken as string),
    enabled: Boolean(accessToken && zoneId),
    retry: shouldRetry,
  });
}

export function useCreateHostedZone() {
  const { accessToken } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: HostedZoneCreateInput) =>
      createHostedZone(input, accessToken as string),
    retry: false,
    onSuccess: (zone) => {
      queryClient.setQueryData(hostedZoneKeys.detail(zone.id), zone);
      void queryClient.invalidateQueries({ queryKey: hostedZoneKeys.all });
    },
  });
}

export function useUpdateHostedZone(zoneId: string) {
  const { accessToken } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: HostedZoneUpdateInput) =>
      updateHostedZone(zoneId, input, accessToken as string),
    retry: false,
    onSuccess: (zone) => {
      queryClient.setQueryData(hostedZoneKeys.detail(zoneId), zone);
      void queryClient.invalidateQueries({ queryKey: hostedZoneKeys.all });
    },
  });
}

export function useDeleteHostedZone(zoneId: string) {
  const { accessToken } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => deleteHostedZone(zoneId, accessToken as string),
    retry: false,
    onSuccess: () => {
      queryClient.removeQueries({ queryKey: hostedZoneKeys.detail(zoneId) });
      void queryClient.invalidateQueries({ queryKey: hostedZoneKeys.all });
    },
  });
}
