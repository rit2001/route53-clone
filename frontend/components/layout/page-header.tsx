import type { ReactNode } from "react";

import {
  Breadcrumbs,
  type BreadcrumbItem,
} from "@/components/layout/breadcrumbs";

type PageHeaderProps = Readonly<{
  title: string;
  description?: string;
  actions?: ReactNode;
  breadcrumbs?: readonly BreadcrumbItem[];
  secondary?: ReactNode;
}>;

export function PageHeader({
  title,
  description,
  actions,
  breadcrumbs,
  secondary,
}: PageHeaderProps) {
  return (
    <header className="mb-5">
      {breadcrumbs ? <Breadcrumbs items={breadcrumbs} /> : null}
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
        <div>
          <h1 className="text-2xl font-semibold leading-tight tracking-tight">
            {title}
          </h1>
          {description ? (
            <p className="mt-1 max-w-4xl text-sm leading-5 text-[var(--muted)]">
              {description}
            </p>
          ) : null}
          {secondary ? <div className="mt-2">{secondary}</div> : null}
        </div>
        {actions ? (
          <div className="flex shrink-0 items-center gap-2">{actions}</div>
        ) : null}
      </div>
    </header>
  );
}
