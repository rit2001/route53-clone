import { HostedZoneForm } from "@/components/hosted-zones/hosted-zone-form";
import { PageHeader } from "@/components/layout/page-header";

export const metadata = {
  title: "Create hosted zone",
};

export default function CreateHostedZonePage() {
  return (
    <>
      <PageHeader
        breadcrumbs={[
          { label: "Route 53", href: "/route53/dashboard" },
          { label: "Hosted zones", href: "/route53/hosted-zones" },
          { label: "Create hosted zone" },
        ]}
        description="Create a persisted public or private DNS namespace in the mocked console."
        title="Create hosted zone"
      />
      <HostedZoneForm />
    </>
  );
}
