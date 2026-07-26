const DEFAULT_API_URL = "http://localhost:8000/api/v1";
const LOCAL_HOSTNAMES = new Set(["localhost", "127.0.0.1", "::1"]);

function isLocalBrowser(): boolean {
  return (
    typeof window !== "undefined" &&
    LOCAL_HOSTNAMES.has(window.location.hostname)
  );
}

export function getApiBaseUrl(): string {
  const configuredUrl = process.env.NEXT_PUBLIC_API_URL?.trim();
  const isProduction = process.env.NODE_ENV === "production";

  if (!configuredUrl && isProduction) {
    throw new Error("NEXT_PUBLIC_API_URL is required in production.");
  }

  const apiUrl = (configuredUrl || DEFAULT_API_URL).replace(/\/+$/, "");
  let parsedUrl: URL;

  try {
    parsedUrl = new URL(apiUrl);
    if (!["http:", "https:"].includes(parsedUrl.protocol)) {
      throw new Error("Unsupported protocol");
    }
  } catch {
    throw new Error(
      "NEXT_PUBLIC_API_URL must be an absolute HTTP(S) URL ending in /api/v1.",
    );
  }

  if (
    parsedUrl.username ||
    parsedUrl.password ||
    parsedUrl.search ||
    parsedUrl.hash ||
    parsedUrl.pathname !== "/api/v1"
  ) {
    throw new Error("NEXT_PUBLIC_API_URL must end in /api/v1.");
  }

  if (
    isProduction &&
    (parsedUrl.protocol !== "https:" ||
      LOCAL_HOSTNAMES.has(parsedUrl.hostname)) &&
    !(
      LOCAL_HOSTNAMES.has(parsedUrl.hostname) &&
      isLocalBrowser()
    )
  ) {
    throw new Error(
      "NEXT_PUBLIC_API_URL must use a non-local HTTPS URL in production.",
    );
  }

  return parsedUrl.toString().replace(/\/+$/, "");
}
