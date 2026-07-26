"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";

import { AuthLoadingScreen } from "@/components/auth/auth-loading-screen";
import { useAuth } from "@/components/auth/auth-provider";
import { Route53Shell } from "@/components/aws-shell/route53-shell";

type ProtectedRoute53LayoutProps = Readonly<{
  children: ReactNode;
}>;

export function ProtectedRoute53Layout({
  children,
}: ProtectedRoute53LayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { status } = useAuth();

  useEffect(() => {
    if (status === "unauthenticated") {
      const currentSearch =
        typeof window === "undefined" ? "" : window.location.search;
      const currentRoute = `${pathname}${currentSearch}`;
      const destination = pathname.startsWith("/route53")
        ? `?next=${encodeURIComponent(currentRoute)}`
        : "";
      router.replace(`/login${destination}`);
    }
  }, [pathname, router, status]);

  if (status !== "authenticated") {
    return <AuthLoadingScreen />;
  }

  return <Route53Shell>{children}</Route53Shell>;
}
