import { Suspense } from "react";

import { HostedZoneTableSkeleton } from "@/components/hosted-zones/hosted-zone-table-skeleton";
import { HostedZonesPageContent } from "@/components/hosted-zones/hosted-zones-page";
import { PageHeader } from "@/components/layout/page-header";

export const metadata = {
  title: "Hosted zones",
};

export default function HostedZonesPage() {
  return (
    <Suspense
      fallback={
        <>
          <PageHeader
            breadcrumbs={[
              { label: "Route 53", href: "/route53/dashboard" },
              { label: "Hosted zones" },
            ]}
            title="Hosted zones"
          />
          <section className="surface-panel overflow-hidden">
            <HostedZoneTableSkeleton />
          </section>
        </>
      }
    >
      <HostedZonesPageContent />
    </Suspense>
  );
}
