import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { StrictMode, useState } from "react";

import {
  getCurrentUser,
  login as requestLogin,
  logout as requestLogout,
} from "@/lib/api/auth";
import { ApiError } from "@/lib/api/errors";
import {
  SESSION_STORAGE_KEY,
  storeSession,
} from "@/lib/auth/session-storage";
import type { AuthUser } from "@/types/auth";

import { AuthProvider, useAuth } from "./auth-provider";

vi.mock("@/lib/api/auth", () => ({
  getCurrentUser: vi.fn(),
  login: vi.fn(),
  logout: vi.fn(),
}));

const user: AuthUser = {
  id: "user-id",
  name: "Route53 Demo User",
  email: "demo@route53.local",
  created_at: "2026-07-26T10:00:00Z",
};
const future = "2099-01-01T00:00:00Z";

  function AuthHarness() {
  const auth = useAuth();
  const [message, setMessage] = useState("");

  return (
    <div>
      <span>{auth.status}</span>
      <span>{auth.user?.email ?? "no-user"}</span>
      <span>{auth.accessToken ?? "no-token"}</span>
      <span>{message}</span>
      <button
        onClick={() => {
          void auth
            .login({
              email: "demo@route53.local",
              password: "Route53Demo123!",
            })
            .catch((error: unknown) => {
              setMessage(error instanceof Error ? error.message : "error");
            });
        }}
        type="button"
      >
        Log in
      </button>
      <button
        onClick={() => {
          void auth.logout().then(() => setMessage("logout complete"));
        }}
        type="button"
      >
        Log out
      </button>
    </div>
  );
}

function renderProvider(strict = false) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const provider = (
    <AuthProvider>
      <AuthHarness />
    </AuthProvider>
  );
  render(
    <QueryClientProvider client={queryClient}>
      {strict ? <StrictMode>{provider}</StrictMode> : provider}
    </QueryClientProvider>,
  );
  return queryClient;
}

describe("AuthProvider", () => {
  beforeEach(() => {
    vi.mocked(getCurrentUser).mockReset();
    vi.mocked(requestLogin).mockReset();
    vi.mocked(requestLogout).mockReset();
  });

  it("starts in the loading state", () => {
    renderProvider();
    expect(screen.getByText("loading")).toBeInTheDocument();
  });

  it("restores and validates a stored session", async () => {
    storeSession({ accessToken: "stored-token", expiresAt: future });
    vi.mocked(getCurrentUser).mockResolvedValue(user);

    renderProvider();

    await screen.findByText("authenticated");
    expect(getCurrentUser).toHaveBeenCalledWith("stored-token");
    expect(screen.getByText(user.email)).toBeInTheDocument();
  });

  it("avoids duplicate restoration requests in development Strict Mode", async () => {
    storeSession({ accessToken: "stored-token", expiresAt: future });
    vi.mocked(getCurrentUser).mockResolvedValue(user);

    renderProvider(true);

    await screen.findByText("authenticated");
    expect(getCurrentUser).toHaveBeenCalledOnce();
  });

  it("removes an invalid stored session", async () => {
    storeSession({ accessToken: "invalid-token", expiresAt: future });
    vi.mocked(getCurrentUser).mockRejectedValue(
      new ApiError(401, "INVALID_SESSION", "The session token is invalid."),
    );

    renderProvider();

    await screen.findByText("unauthenticated");
    expect(localStorage.getItem(SESSION_STORAGE_KEY)).toBeNull();
  });

  it("does not call /auth/me for an expired local session", async () => {
    storeSession({
      accessToken: "expired-token",
      expiresAt: "2020-01-01T00:00:00Z",
    });

    renderProvider();

    await screen.findByText("unauthenticated");
    expect(getCurrentUser).not.toHaveBeenCalled();
  });

  it("stores the token and user after successful login", async () => {
    vi.mocked(requestLogin).mockResolvedValue({
      access_token: "new-token",
      token_type: "bearer",
      expires_at: future,
      user,
    });
    renderProvider();
    await screen.findByText("unauthenticated");

    fireEvent.click(screen.getByRole("button", { name: "Log in" }));

    await screen.findByText("authenticated");
    expect(screen.getByText("new-token")).toBeInTheDocument();
    expect(localStorage.getItem(SESSION_STORAGE_KEY)).toContain("new-token");
    expect(localStorage.getItem(SESSION_STORAGE_KEY)).not.toContain(
      "Route53Demo123!",
    );
  });

  it("surfaces a safe login error without creating a session", async () => {
    vi.mocked(requestLogin).mockRejectedValue(
      new ApiError(
        401,
        "INVALID_CREDENTIALS",
        "The email or password is incorrect.",
      ),
    );
    renderProvider();
    await screen.findByText("unauthenticated");

    fireEvent.click(screen.getByRole("button", { name: "Log in" }));

    await screen.findByText("The email or password is incorrect.");
    expect(localStorage.getItem(SESSION_STORAGE_KEY)).toBeNull();
  });

  it("calls the backend and clears state during logout", async () => {
    storeSession({ accessToken: "stored-token", expiresAt: future });
    vi.mocked(getCurrentUser).mockResolvedValue(user);
    vi.mocked(requestLogout).mockResolvedValue();
    renderProvider();
    await screen.findByText("authenticated");

    fireEvent.click(screen.getByRole("button", { name: "Log out" }));

    await screen.findByText("unauthenticated");
    expect(requestLogout).toHaveBeenCalledWith("stored-token");
    expect(localStorage.getItem(SESSION_STORAGE_KEY)).toBeNull();
  });

  it("clears local state when backend logout fails", async () => {
    storeSession({ accessToken: "stored-token", expiresAt: future });
    vi.mocked(getCurrentUser).mockResolvedValue(user);
    vi.mocked(requestLogout).mockRejectedValue(new Error("offline"));
    renderProvider();
    await screen.findByText("authenticated");

    fireEvent.click(screen.getByRole("button", { name: "Log out" }));

    await screen.findByText("unauthenticated");
    expect(screen.getByText("logout complete")).toBeInTheDocument();
    expect(localStorage.getItem(SESSION_STORAGE_KEY)).toBeNull();
  });

  it("clears the TanStack Query cache during logout", async () => {
    storeSession({ accessToken: "stored-token", expiresAt: future });
    vi.mocked(getCurrentUser).mockResolvedValue(user);
    vi.mocked(requestLogout).mockResolvedValue();
    const queryClient = renderProvider();
    queryClient.setQueryData(["hosted-zones"], { items: [] });
    await screen.findByText("authenticated");

    fireEvent.click(screen.getByRole("button", { name: "Log out" }));

    await waitFor(() =>
      expect(queryClient.getQueryData(["hosted-zones"])).toBeUndefined(),
    );
  });
});
