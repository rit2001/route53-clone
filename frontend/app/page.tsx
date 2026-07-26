"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { AuthLoadingScreen } from "@/components/auth/auth-loading-screen";
import { useAuth } from "@/components/auth/auth-provider";

export default function Home() {
  const router = useRouter();
  const { status } = useAuth();

  useEffect(() => {
    if (status === "authenticated") {
      router.replace("/route53/dashboard");
    } else if (status === "unauthenticated") {
      router.replace("/login");
    }
  }, [router, status]);

  return <AuthLoadingScreen />;
}
