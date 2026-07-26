import type { ReactNode } from "react";

import { ProtectedRoute53Layout } from "@/components/auth/protected-route53-layout";

type Route53LayoutProps = Readonly<{
  children: ReactNode;
}>;

export default function Route53Layout({ children }: Route53LayoutProps) {
  return <ProtectedRoute53Layout>{children}</ProtectedRoute53Layout>;
}
