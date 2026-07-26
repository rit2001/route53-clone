"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo } from "react";

import {
  parseDNSRecordListState,
  updateDNSRecordListSearchParams,
} from "@/lib/dns-records/list-state";
import type { DNSRecordListParams } from "@/types/dns-record";

export function useDNSRecordListState() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const state = useMemo(
    () => parseDNSRecordListState(new URLSearchParams(searchParams.toString())),
    [searchParams],
  );
  const updateState = useCallback(
    (patch: Partial<DNSRecordListParams>) => {
      const next = updateDNSRecordListSearchParams(
        new URLSearchParams(searchParams.toString()),
        patch,
      );
      const query = next.toString();
      router.push(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  return { state, updateState };
}
