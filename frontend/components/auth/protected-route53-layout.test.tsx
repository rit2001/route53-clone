import { render, screen, waitFor } from "@testing-library/react";

import { ProtectedRoute53Layout } from "./protected-route53-layout";

const gateMocks = vi.hoisted(() => ({
  pathname: "/route53/hosted-zones",
  replace: vi.fn(),
  status: "loading" as "loading" | "authenticated" | "unauthenticated",
}));

vi.mock("next/navigation", () => ({
  usePathname: () => gateMocks.pathname,
  useRouter: () => ({ replace: gateMocks.replace }),
}));

vi.mock("@/components/auth/auth-provider", () => ({
  useAuth: () => ({
    status: gateMocks.status,
    user:
      gateMocks.status === "authenticated"
        ? {
            id: "user-id",
            name: "Route53 Demo User",
            email: "demo@route53.local",
            created_at: "2026-07-26T10:00:00Z",
          }
        : null,
    accessToken: gateMocks.status === "authenticated" ? "token" : null,
    login: vi.fn(),
    logout: vi.fn(),
  }),
}));

describe("ProtectedRoute53Layout", () => {
  beforeEach(() => {
    gateMocks.status = "loading";
    gateMocks.pathname = "/route53/hosted-zones";
    gateMocks.replace.mockReset();
  });

  it("shows the console-shaped loading state during restoration", () => {
    render(
      <ProtectedRoute53Layout>Protected content</ProtectedRoute53Layout>,
    );

    expect(screen.getByText(/Restoring your mock console session/)).toBeInTheDocument();
    expect(screen.queryByText("Protected content")).not.toBeInTheDocument();
  });

  it("redirects unauthenticated users with their internal destination", async () => {
    gateMocks.status = "unauthenticated";
    render(
      <ProtectedRoute53Layout>Protected content</ProtectedRoute53Layout>,
    );

    await waitFor(() =>
      expect(gateMocks.replace).toHaveBeenCalledWith(
        "/login?next=%2Froute53%2Fhosted-zones",
      ),
    );
    expect(screen.queryByText("Protected content")).not.toBeInTheDocument();
  });

  it("renders protected content only after authentication", () => {
    gateMocks.status = "authenticated";
    render(
      <ProtectedRoute53Layout>Protected content</ProtectedRoute53Layout>,
    );

    expect(screen.getByText("Protected content")).toBeInTheDocument();
    expect(gateMocks.replace).not.toHaveBeenCalled();
  });
});
