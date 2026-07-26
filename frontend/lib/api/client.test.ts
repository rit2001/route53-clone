import { apiRequest } from "./client";
import { ApiError } from "./errors";

const API_URL = "http://localhost:8000/api/v1";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("apiRequest", () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_API_URL = API_URL;
  });

  it("parses successful JSON responses", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(jsonResponse({ status: "healthy" })),
    );

    await expect(apiRequest("/health")).resolves.toEqual({
      status: "healthy",
    });
  });

  it("returns undefined for HTTP 204", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response(null, { status: 204 })),
    );

    await expect(
      apiRequest<void>("/auth/logout", { method: "POST" }),
    ).resolves.toBeUndefined();
  });

  it("parses the standard backend error contract", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        jsonResponse(
          {
            detail: {
              code: "INVALID_CREDENTIALS",
              message: "The email or password is incorrect.",
            },
          },
          401,
        ),
      ),
    );

    await expect(apiRequest("/auth/login")).rejects.toMatchObject({
      status: 401,
      code: "INVALID_CREDENTIALS",
      message: "The email or password is incorrect.",
    });
  });

  it("preserves Pydantic validation details", async () => {
    const details = [
      { type: "missing", loc: ["body", "email"], msg: "Field required" },
    ];
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(jsonResponse({ detail: details }, 422)),
    );

    await expect(apiRequest("/auth/login")).rejects.toMatchObject({
      status: 422,
      code: "VALIDATION_ERROR",
      details,
    });
  });

  it("converts network failures to safe API errors", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("offline")));

    await expect(apiRequest("/health")).rejects.toEqual(
      expect.objectContaining({
        status: 0,
        code: "NETWORK_ERROR",
      }),
    );
  });

  it("includes the bearer header when a token is supplied", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(jsonResponse({ id: "user-id" }));
    vi.stubGlobal("fetch", fetchMock);

    await apiRequest("/auth/me", { accessToken: "opaque-secret-token" });

    const request = fetchMock.mock.calls[0]?.[1] as RequestInit;
    expect(new Headers(request.headers).get("Authorization")).toBe(
      "Bearer opaque-secret-token",
    );
  });

  it("omits the authorization header without a token", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ ok: true }));
    vi.stubGlobal("fetch", fetchMock);

    await apiRequest("/health");

    const request = fetchMock.mock.calls[0]?.[1] as RequestInit;
    expect(new Headers(request.headers).has("Authorization")).toBe(false);
  });

  it("never includes a token in thrown error text", async () => {
    const token = "opaque-secret-token";
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        jsonResponse(
          {
            detail: {
              code: "INVALID_SESSION",
              message: "The session token is invalid.",
            },
          },
          401,
        ),
      ),
    );

    const error = await apiRequest("/auth/me", {
      accessToken: token,
    }).catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(ApiError);
    expect(String(error)).not.toContain(token);
  });
});
