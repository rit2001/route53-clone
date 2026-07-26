import { Suspense } from "react";

import { DNSRecordsPage } from "@/components/dns-records/dns-records-page";
import { RecordsTableSkeleton } from "@/components/dns-records/records-table-skeleton";
import { PageHeader } from "@/components/layout/page-header";

type DNSRecordsRouteProps = Readonly<{
  params: Promise<{ zoneId: string }>;
}>;

export const metadata = {
  title: "DNS records",
};

export default async function DNSRecordsRoute({ params }: DNSRecordsRouteProps) {
  const { zoneId } = await params;
  return (
    <Suspense
      fallback={
        <>
          <PageHeader title="DNS records" />
          <section className="surface-panel overflow-hidden">
            <RecordsTableSkeleton />
          </section>
        </>
      }
    >
      <DNSRecordsPage zoneId={zoneId} />
    </Suspense>
  );
}
