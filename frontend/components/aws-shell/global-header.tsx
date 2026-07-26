"use client";

import {
  ChevronDown,
  Globe2,
  LogOut,
  Menu,
  UserRound,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Spinner } from "@/components/ui/spinner";
import type { AuthUser } from "@/types/auth";

type GlobalHeaderProps = Readonly<{
  user: AuthUser;
  onOpenNavigation: () => void;
  onLogout: () => Promise<void>;
}>;

export function GlobalHeader({
  user,
  onOpenNavigation,
  onLogout,
}: GlobalHeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const menuContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function closeOnOutsidePointer(event: MouseEvent) {
      if (
        menuContainerRef.current &&
        !menuContainerRef.current.contains(event.target as Node)
      ) {
        setMenuOpen(false);
      }
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", closeOnOutsidePointer);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeOnOutsidePointer);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, []);

  async function handleLogout() {
    setSigningOut(true);
    setMenuOpen(false);
    await onLogout();
  }

  return (
    <header className="sticky top-0 z-40 h-11 bg-[var(--global-header)] text-white">
      <div className="flex h-full items-center">
        <button
          aria-label="Open service navigation"
          className="ml-1 inline-flex size-9 items-center justify-center rounded-[var(--radius-sm)] hover:bg-white/10 md:hidden"
          onClick={onOpenNavigation}
          type="button"
        >
          <Menu aria-hidden="true" className="size-5" />
        </button>
        <div className="flex h-full min-w-0 items-center">
          <span className="hidden border-r border-white/15 px-4 text-sm font-semibold sm:inline">
            Cloud Console
          </span>
          <span className="truncate px-3 text-sm font-semibold">
            Route 53 Clone
          </span>
          <span className="hidden rounded-[var(--radius-sm)] border border-white/20 px-1.5 py-0.5 text-[0.625rem] uppercase tracking-wide text-slate-300 lg:inline">
            Mock
          </span>
        </div>
        <div className="ml-auto flex h-full items-center">
          <div className="hidden h-full items-center gap-1.5 border-l border-white/10 px-3 text-xs text-slate-200 sm:flex">
            <Globe2 aria-hidden="true" className="size-3.5" />
            Global
          </div>
          <div
            className="relative h-full border-l border-white/10"
            ref={menuContainerRef}
          >
            <button
              aria-expanded={menuOpen}
              aria-haspopup="menu"
              className="flex h-full max-w-52 items-center gap-2 px-3 text-xs hover:bg-white/10"
              onClick={() => setMenuOpen((open) => !open)}
              type="button"
            >
              <UserRound aria-hidden="true" className="size-4 shrink-0" />
              <span className="hidden truncate sm:inline">{user.name}</span>
              <ChevronDown aria-hidden="true" className="size-3.5" />
            </button>
            {menuOpen ? (
              <div
                aria-label="Mock account menu"
                className="absolute right-2 top-[calc(100%+0.375rem)] w-64 rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface)] py-2 text-[var(--text)] shadow-[var(--shadow-menu)]"
                role="menu"
              >
                <div className="border-b border-[var(--border)] px-3 pb-2">
                  <p className="truncate text-sm font-semibold">{user.name}</p>
                  <p className="truncate text-xs text-[var(--muted)]">
                    {user.email}
                  </p>
                  <p className="mt-1 text-[0.6875rem] uppercase tracking-wide text-[var(--muted)]">
                    Mock account
                  </p>
                </div>
                <button
                  className="mt-1 flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-[var(--nav-hover)] disabled:opacity-60"
                  disabled={signingOut}
                  onClick={() => void handleLogout()}
                  role="menuitem"
                  type="button"
                >
                  {signingOut ? (
                    <Spinner label="Signing out" />
                  ) : (
                    <LogOut aria-hidden="true" className="size-4" />
                  )}
                  Sign out
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </header>
  );
}
