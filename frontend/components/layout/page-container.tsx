import type { ReactNode } from "react";

type PageContainerProps = Readonly<{
  children: ReactNode;
  className?: string;
}>;

export function PageContainer({
  children,
  className = "",
}: PageContainerProps) {
  return (
    <div className={`mx-auto w-full max-w-screen-2xl px-4 lg:px-6 ${className}`}>
      {children}
    </div>
  );
}
