import {
  SESSION_STORAGE_KEY,
  clearSession,
  loadSession,
  storeSession,
} from "./session-storage";

const future = "2099-01-01T00:00:00Z";

describe("session storage", () => {
  it("stores only the minimum session fields", () => {
    storeSession({ accessToken: "token", expiresAt: future });

    expect(JSON.parse(localStorage.getItem(SESSION_STORAGE_KEY) ?? "")).toEqual({
      accessToken: "token",
      expiresAt: future,
    });
  });

  it("loads a valid session", () => {
    storeSession({ accessToken: "token", expiresAt: future });

    expect(loadSession()).toEqual({
      accessToken: "token",
      expiresAt: future,
    });
  });

  it("clears a session", () => {
    storeSession({ accessToken: "token", expiresAt: future });
    clearSession();

    expect(localStorage.getItem(SESSION_STORAGE_KEY)).toBeNull();
  });

  it("handles malformed JSON safely", () => {
    localStorage.setItem(SESSION_STORAGE_KEY, "{not-json");

    expect(loadSession()).toBeNull();
    expect(localStorage.getItem(SESSION_STORAGE_KEY)).toBeNull();
  });

  it("removes expired sessions", () => {
    storeSession({
      accessToken: "expired",
      expiresAt: "2020-01-01T00:00:00Z",
    });

    expect(loadSession()).toBeNull();
    expect(localStorage.getItem(SESSION_STORAGE_KEY)).toBeNull();
  });

  it("returns null when no session exists", () => {
    expect(loadSession()).toBeNull();
  });

  it("never persists extra password data", () => {
    storeSession({
      accessToken: "token",
      expiresAt: future,
      password: "not-allowed",
    } as Parameters<typeof storeSession>[0] & { password: string });

    expect(localStorage.getItem(SESSION_STORAGE_KEY)).not.toContain(
      "not-allowed",
    );
  });

  it("sanitises unexpected fields from previously stored data", () => {
    localStorage.setItem(
      SESSION_STORAGE_KEY,
      JSON.stringify({
        accessToken: "token",
        expiresAt: future,
        password: "legacy-value",
      }),
    );

    expect(loadSession()).toEqual({
      accessToken: "token",
      expiresAt: future,
    });
    expect(localStorage.getItem(SESSION_STORAGE_KEY)).not.toContain(
      "legacy-value",
    );
  });
});
