import { afterEach, describe, expect, it, vi } from "vitest";

import { getApiBaseUrl } from "@/lib/env";

describe("getApiBaseUrl", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("uses the localhost API only outside production", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("NEXT_PUBLIC_API_URL", "");

    expect(getApiBaseUrl()).toBe("http://localhost:8000/api/v1");
  });

  it("normalises trailing slashes", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv(
      "NEXT_PUBLIC_API_URL",
      "https://route53-api.example.com/api/v1///",
    );

    expect(getApiBaseUrl()).toBe(
      "https://route53-api.example.com/api/v1",
    );
  });

  it("rejects a missing production API URL", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_API_URL", "");

    expect(() => getApiBaseUrl()).toThrow(
      "NEXT_PUBLIC_API_URL is required in production.",
    );
  });

  it.each([
    "http://localhost:8000/api/v1",
    "http://127.0.0.1:8000/api/v1",
    "http://route53-api.example.com/api/v1",
  ])("rejects an insecure or local production URL: %s", (apiUrl) => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_API_URL", apiUrl);
    vi.stubGlobal("window", {
      location: { hostname: "route53-console.vercel.app" },
    });

    expect(() => getApiBaseUrl()).toThrow(
      "NEXT_PUBLIC_API_URL must use a non-local HTTPS URL in production.",
    );
  });

  it("allows the explicit localhost API for a locally opened container", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv(
      "NEXT_PUBLIC_API_URL",
      "http://localhost:8000/api/v1",
    );
    vi.stubGlobal("window", {
      location: { hostname: "localhost" },
    });

    expect(getApiBaseUrl()).toBe("http://localhost:8000/api/v1");
  });

  it("accepts the deployed Railway API URL in production", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv(
      "NEXT_PUBLIC_API_URL",
      "https://route53-api.up.railway.app/api/v1/",
    );

    expect(getApiBaseUrl()).toBe(
      "https://route53-api.up.railway.app/api/v1",
    );
  });

  it.each([
    "https://route53-api.example.com/",
    "https://route53-api.example.com/api/v1?token=value",
    "ftp://route53-api.example.com/api/v1",
  ])("rejects an invalid API URL: %s", (apiUrl) => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("NEXT_PUBLIC_API_URL", apiUrl);

    expect(() => getApiBaseUrl()).toThrow();
  });
});
