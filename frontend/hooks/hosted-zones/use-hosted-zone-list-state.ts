"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo } from "react";

import {
  parseHostedZoneListState,
  updateHostedZoneListSearchParams,
  type HostedZoneListStatePatch,
} from "@/lib/hosted-zones/list-state";

export function useHostedZoneListState() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const serialized = searchParams.toString();
  const state = useMemo(
    () => parseHostedZoneListState(new URLSearchParams(serialized)),
    [serialized],
  );

  const updateState = useCallback(
    (patch: HostedZoneListStatePatch) => {
      const next = updateHostedZoneListSearchParams(
        new URLSearchParams(serialized),
        patch,
      );
      const query = next.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, {
        scroll: false,
      });
    },
    [pathname, router, serialized],
  );

  return { state, updateState };
}
