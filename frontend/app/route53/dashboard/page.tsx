import { ArrowRight, Info, Network, ShieldCheck } from "lucide-react";
import Link from "next/link";

import { PageHeader } from "@/components/layout/page-header";

export const metadata = {
  title: "Route 53 dashboard",
};

export default function DashboardPage() {
  return (
    <>
      <PageHeader
        breadcrumbs={[
          { label: "Route 53", href: "/route53/dashboard" },
          { label: "Dashboard" },
        ]}
        description="Manage hosted zones and DNS record sets through the cloned console."
        title="Route 53 dashboard"
      />

      <div
        className="mb-4 flex items-start gap-3 rounded-[var(--radius-sm)] border border-[var(--info-border)] bg-[var(--info-soft)] p-3 text-sm"
        role="note"
      >
        <Info
          aria-hidden="true"
          className="mt-0.5 size-4 shrink-0 text-[var(--link)]"
        />
        <p>
          This demonstration reproduces management workflows with mocked control
          plane data. It does not publish or resolve real DNS.
        </p>
      </div>

      <section className="surface-panel" aria-labelledby="getting-started">
        <div className="border-b border-[var(--border)] px-5 py-3">
          <h2 className="text-base font-semibold" id="getting-started">
            Getting started
          </h2>
        </div>
        <div className="grid divide-y divide-[var(--border)] md:grid-cols-2 md:divide-x md:divide-y-0">
          <div className="p-5">
            <div className="flex items-center gap-2">
              <Network
                aria-hidden="true"
                className="size-5 text-[var(--link)]"
              />
              <h3 className="font-semibold">Hosted zones</h3>
            </div>
            <p className="mt-2 text-sm leading-5 text-[var(--muted)]">
              Create, search, inspect, update, and delete persisted public or
              private hosted zones through the authenticated API.
            </p>
            <Link
              className="mt-3 inline-flex items-center gap-1 text-sm font-semibold hover:underline"
              href="/route53/hosted-zones"
            >
              Open hosted zones
              <ArrowRight aria-hidden="true" className="size-3.5" />
            </Link>
          </div>
          <div className="p-5">
            <div className="flex items-center gap-2">
              <ShieldCheck
                aria-hidden="true"
                className="size-5 text-[var(--link)]"
              />
              <h3 className="font-semibold">Mock session active</h3>
            </div>
            <p className="mt-2 text-sm leading-5 text-[var(--muted)]">
              Your opaque bearer session was validated against the backend. Use
              the account menu in the utility header to sign out.
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
