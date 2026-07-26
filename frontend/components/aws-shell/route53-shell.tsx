"use client";

import { X } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import {
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { useAuth } from "@/components/auth/auth-provider";
import { GlobalHeader } from "@/components/aws-shell/global-header";
import { ServiceSidebar } from "@/components/aws-shell/service-sidebar";
import { PageContainer } from "@/components/layout/page-container";

type Route53ShellProps = Readonly<{
  children: ReactNode;
}>;

export function Route53Shell({ children }: Route53ShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const openButtonRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!mobileOpen) {
      return;
    }

    closeButtonRef.current?.focus();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setMobileOpen(false);
        openButtonRef.current?.focus();
      }
    }
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("keydown", closeOnEscape);
      document.body.style.overflow = previousOverflow;
    };
  }, [mobileOpen]);

  if (!user) {
    return null;
  }

  async function handleLogout() {
    await logout();
    router.replace("/login");
  }

  function openNavigation() {
    openButtonRef.current = document.activeElement as HTMLElement | null;
    setMobileOpen(true);
  }

  function closeNavigation() {
    setMobileOpen(false);
    openButtonRef.current?.focus();
  }

  return (
    <div className="min-h-screen bg-[var(--page-background)]">
      <a className="skip-link" href="#main-content">
        Skip to main content
      </a>
      <GlobalHeader
        onLogout={handleLogout}
        onOpenNavigation={openNavigation}
        user={user}
      />
      <div className="flex min-h-[calc(100vh-2.75rem)]">
        <aside className="sticky top-11 hidden h-[calc(100vh-2.75rem)] w-60 shrink-0 overflow-y-auto border-r border-[var(--border)] bg-[var(--sidebar)] md:block">
          <ServiceSidebar pathname={pathname} />
        </aside>
        {mobileOpen ? (
          <div className="fixed inset-0 top-11 z-30 md:hidden">
            <button
              aria-label="Close service navigation"
              className="absolute inset-0 bg-black/40"
              onClick={closeNavigation}
              type="button"
            />
            <aside
              aria-label="Mobile service navigation"
              className="relative h-full w-[min(19rem,88vw)] overflow-y-auto border-r border-[var(--border)] bg-[var(--sidebar)] shadow-[var(--shadow-menu)]"
            >
              <div className="flex h-10 items-center justify-between border-b border-[var(--border)] px-4">
                <span className="text-sm font-semibold">Route 53 navigation</span>
                <button
                  aria-label="Close service navigation"
                  className="inline-flex size-8 items-center justify-center rounded-[var(--radius-sm)] hover:bg-[var(--nav-hover)]"
                  onClick={closeNavigation}
                  ref={closeButtonRef}
                  type="button"
                >
                  <X aria-hidden="true" className="size-4" />
                </button>
              </div>
              <ServiceSidebar
                onNavigate={() => setMobileOpen(false)}
                pathname={pathname}
              />
            </aside>
          </div>
        ) : null}
        <main className="min-w-0 flex-1" id="main-content" tabIndex={-1}>
          <PageContainer className="py-5 sm:py-6">{children}</PageContainer>
        </main>
      </div>
    </div>
  );
}
