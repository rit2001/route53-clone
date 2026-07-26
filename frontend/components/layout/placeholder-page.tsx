import { Clock3 } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";

type PlaceholderPageProps = Readonly<{
  title: string;
  description: string;
}>;

export function PlaceholderPage({
  title,
  description,
}: PlaceholderPageProps) {
  return (
    <>
      <PageHeader
        breadcrumbs={[
          { label: "Route 53", href: "/route53/dashboard" },
          { label: title },
        ]}
        description={description}
        title={title}
      />
      <section className="surface-panel p-5" aria-labelledby="feature-status">
        <div className="flex items-start gap-3">
          <Clock3
            aria-hidden="true"
            className="mt-0.5 size-5 text-[var(--muted)]"
          />
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base font-semibold" id="feature-status">
                Not included in the current assignment scope
              </h2>
              <span className="status-badge">Coming soon</span>
            </div>
            <p className="mt-2 max-w-2xl text-sm leading-5 text-[var(--muted)]">
              This console route is reserved so the service navigation remains
              realistic. No controls or operational data are available here yet.
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
