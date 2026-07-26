import { HostedZoneDetails } from "@/components/hosted-zones/hosted-zone-details";

type HostedZoneDetailPageProps = Readonly<{
  params: Promise<{ zoneId: string }>;
}>;

export const metadata = {
  title: "Hosted zone details",
};

export default async function HostedZoneDetailPage({
  params,
}: HostedZoneDetailPageProps) {
  const { zoneId } = await params;
  return <HostedZoneDetails zoneId={zoneId} />;
}
