import Link from "next/link";

export type BreadcrumbItem = {
  label: string;
  href?: string;
};

type BreadcrumbsProps = Readonly<{
  items: readonly BreadcrumbItem[];
}>;

export function Breadcrumbs({ items }: BreadcrumbsProps) {
  return (
    <nav aria-label="Breadcrumb" className="mb-3 text-xs">
      <ol className="flex flex-wrap items-center gap-1.5">
        {items.map((item, index) => {
          const current = index === items.length - 1;
          return (
            <li className="flex items-center gap-1.5" key={`${item.label}-${index}`}>
              {index > 0 ? (
                <span aria-hidden="true" className="text-[var(--muted)]">
                  /
                </span>
              ) : null}
              {item.href && !current ? (
                <Link className="hover:underline" href={item.href}>
                  {item.label}
                </Link>
              ) : (
                <span
                  aria-current={current ? "page" : undefined}
                  className="text-[var(--muted)]"
                >
                  {item.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
