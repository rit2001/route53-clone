const DEFAULT_AUTHENTICATED_ROUTE = "/route53/dashboard";

export function getSafeInternalPath(
  candidate: string | null | undefined,
  fallback = DEFAULT_AUTHENTICATED_ROUTE,
): string {
  if (
    !candidate ||
    !candidate.startsWith("/") ||
    candidate.startsWith("//") ||
    candidate.includes("\\") ||
    candidate.includes("\u0000")
  ) {
    return fallback;
  }

  try {
    const parsed = new URL(candidate, "http://route53-clone.local");
    if (
      parsed.origin !== "http://route53-clone.local" ||
      parsed.pathname === "/login"
    ) {
      return fallback;
    }
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return fallback;
  }
}
