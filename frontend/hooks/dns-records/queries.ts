"use client";

import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import { useAuth } from "@/components/auth/auth-provider";
import { hostedZoneKeys } from "@/hooks/hosted-zones/queries";
import {
  createDNSRecord,
  deleteDNSRecord,
  getDNSRecord,
  listDNSRecords,
  updateDNSRecord,
} from "@/lib/api/dns-records";
import { ApiError } from "@/lib/api/errors";
import type {
  DNSRecordCreateInput,
  DNSRecordListParams,
  DNSRecordUpdateInput,
} from "@/types/dns-record";

export const dnsRecordKeys = {
  all: (zoneId: string) => ["dns-records", zoneId] as const,
  list: (zoneId: string, params: DNSRecordListParams) =>
    ["dns-records", zoneId, params] as const,
  detail: (zoneId: string, recordId: string) =>
    ["dns-record", zoneId, recordId] as const,
};

function shouldRetry(failureCount: number, error: Error): boolean {
  if (error instanceof ApiError && [401, 404, 422].includes(error.status)) {
    return false;
  }
  return failureCount < 1;
}

export function useDNSRecords(
  zoneId: string,
  params: DNSRecordListParams,
) {
  const { accessToken } = useAuth();
  return useQuery({
    queryKey: dnsRecordKeys.list(zoneId, params),
    queryFn: () => listDNSRecords(zoneId, params, accessToken as string),
    enabled: Boolean(accessToken && zoneId),
    placeholderData: keepPreviousData,
    retry: shouldRetry,
  });
}

export function useDNSRecord(zoneId: string, recordId: string) {
  const { accessToken } = useAuth();
  return useQuery({
    queryKey: dnsRecordKeys.detail(zoneId, recordId),
    queryFn: () => getDNSRecord(zoneId, recordId, accessToken as string),
    enabled: Boolean(accessToken && zoneId && recordId),
    retry: shouldRetry,
  });
}

export function useCreateDNSRecord(zoneId: string) {
  const { accessToken } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: DNSRecordCreateInput) =>
      createDNSRecord(zoneId, input, accessToken as string),
    retry: false,
    onSuccess: (record) => {
      queryClient.setQueryData(
        dnsRecordKeys.detail(zoneId, record.id),
        record,
      );
      void queryClient.invalidateQueries({
        queryKey: dnsRecordKeys.all(zoneId),
      });
      void queryClient.invalidateQueries({
        queryKey: hostedZoneKeys.detail(zoneId),
      });
      void queryClient.invalidateQueries({ queryKey: hostedZoneKeys.all });
    },
  });
}

export function useUpdateDNSRecord(zoneId: string, recordId: string) {
  const { accessToken } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: DNSRecordUpdateInput) =>
      updateDNSRecord(zoneId, recordId, input, accessToken as string),
    retry: false,
    onSuccess: (record) => {
      queryClient.setQueryData(
        dnsRecordKeys.detail(zoneId, recordId),
        record,
      );
      void queryClient.invalidateQueries({
        queryKey: dnsRecordKeys.all(zoneId),
      });
    },
  });
}

export function useDeleteDNSRecord(zoneId: string, recordId: string) {
  const { accessToken } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () =>
      deleteDNSRecord(zoneId, recordId, accessToken as string),
    retry: false,
    onSuccess: () => {
      queryClient.removeQueries({
        queryKey: dnsRecordKeys.detail(zoneId, recordId),
      });
      void queryClient.invalidateQueries({
        queryKey: dnsRecordKeys.all(zoneId),
      });
      void queryClient.invalidateQueries({
        queryKey: hostedZoneKeys.detail(zoneId),
      });
      void queryClient.invalidateQueries({ queryKey: hostedZoneKeys.all });
    },
  });
}
