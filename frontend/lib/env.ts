const DEFAULT_API_URL = "http://localhost:8000/api/v1";

export function getApiBaseUrl(): string {
  const configuredUrl = process.env.NEXT_PUBLIC_API_URL?.trim();
  const apiUrl = (configuredUrl || DEFAULT_API_URL).replace(/\/+$/, "");

  try {
    const parsedUrl = new URL(apiUrl);
    if (!["http:", "https:"].includes(parsedUrl.protocol)) {
      throw new Error("Unsupported protocol");
    }
  } catch {
    throw new Error(
      "NEXT_PUBLIC_API_URL must be an absolute HTTP(S) URL ending in /api/v1.",
    );
  }

  if (!apiUrl.endsWith("/api/v1")) {
    throw new Error("NEXT_PUBLIC_API_URL must end in /api/v1.");
  }

  return apiUrl;
}
