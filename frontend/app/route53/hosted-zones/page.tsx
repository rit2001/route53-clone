import { Database } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";

export const metadata = {
  title: "Hosted zones",
};

export default function HostedZonesPage() {
  return (
    <>
      <PageHeader
        breadcrumbs={[
          { label: "Route 53", href: "/route53/dashboard" },
          { label: "Hosted zones" },
        ]}
        description="Create and manage public and private DNS namespaces."
        title="Hosted zones"
      />
      <section
        aria-labelledby="hosted-zones-status"
        className="surface-panel p-5"
      >
        <div className="flex items-start gap-3">
          <Database
            aria-hidden="true"
            className="mt-0.5 size-5 text-[var(--muted)]"
          />
          <div>
            <h2 className="text-base font-semibold" id="hosted-zones-status">
              Management interface coming next
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-5 text-[var(--muted)]">
              Hosted zone management will be connected to the existing backend
              API in Case 6. No sample zones or fabricated counts are displayed.
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
