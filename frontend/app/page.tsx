import { PageContainer } from "@/components/layout/page-container";

export default function Home() {
  return (
    <>
      <header className="bg-[var(--utility-header)] text-white">
        <PageContainer className="flex h-11 items-center">
          <span className="text-sm font-semibold tracking-wide">
            Route53 Clone
          </span>
        </PageContainer>
      </header>
      <nav
        aria-label="Service navigation"
        className="border-b border-[var(--border)] bg-white"
      >
        <PageContainer className="flex h-10 items-center text-sm font-semibold">
          DNS management
        </PageContainer>
      </nav>
      <main>
        <PageContainer className="py-10">
          <div className="max-w-2xl rounded-sm border border-[var(--border)] bg-[var(--surface)] p-6">
            <p className="mb-2 text-xs text-[#5f6b7a]">
              Route53 Clone / Foundation
            </p>
            <h1 className="text-2xl font-semibold">Under development</h1>
            <p className="mt-3 text-sm leading-6 text-[#414d5c]">
              The application foundation is ready. Hosted zone, DNS record, and
              mock authentication workflows will be added in the next cases.
            </p>
          </div>
        </PageContainer>
      </main>
    </>
  );
}
