import { Spinner } from "@/components/ui/spinner";

export function AuthLoadingScreen() {
  return (
    <div className="min-h-screen bg-[var(--page-background)]">
      <div className="h-11 bg-[var(--global-header)]" />
      <div className="flex min-h-[calc(100vh-2.75rem)]">
        <div className="hidden w-60 border-r border-[var(--border)] bg-[var(--sidebar)] md:block" />
        <main
          aria-busy="true"
          aria-live="polite"
          className="flex flex-1 items-center justify-center p-6"
        >
          <div
            className="flex items-center gap-3 rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface)] px-5 py-4 text-sm text-[var(--muted)]"
            role="status"
          >
            <Spinner label="Restoring session" />
            Restoring your mock console session…
          </div>
        </main>
      </div>
    </div>
  );
}
