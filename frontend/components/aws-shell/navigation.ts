import {
  Activity,
  Gauge,
  Globe2,
  Network,
  PanelsTopLeft,
  Route,
} from "lucide-react";

export const navigationGroups = [
  {
    label: "Route 53",
    items: [
      {
        label: "Dashboard",
        href: "/route53/dashboard",
        icon: Gauge,
      },
      {
        label: "Hosted zones",
        href: "/route53/hosted-zones",
        icon: Globe2,
      },
    ],
  },
  {
    label: "Traffic management",
    items: [
      {
        label: "Traffic policies",
        href: "/route53/traffic-policies",
        icon: Route,
      },
      {
        label: "Health checks",
        href: "/route53/health-checks",
        icon: Activity,
      },
    ],
  },
  {
    label: "Network services",
    items: [
      {
        label: "Resolver",
        href: "/route53/resolver",
        icon: Network,
      },
      {
        label: "Profiles",
        href: "/route53/profiles",
        icon: PanelsTopLeft,
      },
    ],
  },
] as const;
