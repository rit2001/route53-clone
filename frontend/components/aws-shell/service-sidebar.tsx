import Link from "next/link";

import { navigationGroups } from "./navigation";

type ServiceSidebarProps = Readonly<{
  pathname: string;
  onNavigate?: () => void;
}>;

export function ServiceSidebar({
  pathname,
  onNavigate,
}: ServiceSidebarProps) {
  return (
    <nav aria-label="Route 53 service navigation" className="py-3">
      {navigationGroups.map((group) => (
        <section className="mb-4" key={group.label}>
          <h2 className="px-4 pb-1 text-[0.6875rem] font-semibold uppercase tracking-wide text-[var(--muted)]">
            {group.label}
          </h2>
          <ul>
            {group.items.map((item) => {
              const active = pathname === item.href;
              const Icon = item.icon;
              return (
                <li key={item.href}>
                  <Link
                    aria-current={active ? "page" : undefined}
                    className={`flex min-h-9 items-center gap-2.5 border-l-[3px] px-3 text-sm font-medium transition-colors motion-reduce:transition-none ${
                      active
                        ? "border-[var(--primary)] bg-[var(--nav-active)] text-[var(--text)]"
                        : "border-transparent text-[var(--muted-strong)] hover:bg-[var(--nav-hover)] hover:text-[var(--text)]"
                    }`}
                    href={item.href}
                    onClick={onNavigate}
                  >
                    <Icon aria-hidden="true" className="size-4" />
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </nav>
  );
}
