import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { PlaceholderPage } from "@/components/layout/placeholder-page";

import { Route53Shell } from "./route53-shell";

const shellMocks = vi.hoisted(() => ({
  pathname: "/route53/dashboard",
  replace: vi.fn(),
  logout: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => shellMocks.pathname,
  useRouter: () => ({ replace: shellMocks.replace }),
}));

vi.mock("@/components/auth/auth-provider", () => ({
  useAuth: () => ({
    status: "authenticated",
    accessToken: "token",
    user: {
      id: "user-id",
      name: "Route53 Demo User",
      email: "demo@route53.local",
      created_at: "2026-07-26T10:00:00Z",
    },
    login: vi.fn(),
    logout: shellMocks.logout,
  }),
}));

describe("Route53Shell", () => {
  beforeEach(() => {
    shellMocks.pathname = "/route53/dashboard";
    shellMocks.logout.mockReset();
    shellMocks.logout.mockResolvedValue(undefined);
    shellMocks.replace.mockReset();
  });

  it("renders every required service link", () => {
    render(<Route53Shell>Content</Route53Shell>);

    [
      "Dashboard",
      "Hosted zones",
      "Traffic policies",
      "Health checks",
      "Resolver",
      "Profiles",
    ].forEach((label) => {
      expect(screen.getByRole("link", { name: label })).toBeInTheDocument();
    });
  });

  it("marks the active route", () => {
    shellMocks.pathname = "/route53/hosted-zones";
    render(<Route53Shell>Content</Route53Shell>);

    expect(screen.getByRole("link", { name: "Hosted zones" })).toHaveAttribute(
      "aria-current",
      "page",
    );
  });

  it("shows the mock user and account details", async () => {
    const user = userEvent.setup();
    render(<Route53Shell>Content</Route53Shell>);

    expect(screen.getByText("Route53 Demo User")).toBeInTheDocument();
    await user.click(
      screen.getByRole("button", { name: /Route53 Demo User/ }),
    );
    expect(screen.getByText("demo@route53.local")).toBeInTheDocument();
    expect(screen.getByText("Mock account")).toBeInTheDocument();
  });

  it("invokes logout and redirects to login", async () => {
    const user = userEvent.setup();
    render(<Route53Shell>Content</Route53Shell>);

    await user.click(
      screen.getByRole("button", { name: /Route53 Demo User/ }),
    );
    await user.click(screen.getByRole("menuitem", { name: "Sign out" }));

    expect(shellMocks.logout).toHaveBeenCalledOnce();
    expect(shellMocks.replace).toHaveBeenCalledWith("/login");
  });

  it("opens and closes the mobile service drawer", async () => {
    const user = userEvent.setup();
    render(<Route53Shell>Content</Route53Shell>);

    await user.click(
      screen.getByRole("button", { name: "Open service navigation" }),
    );
    const drawer = screen.getByLabelText("Mobile service navigation");
    expect(drawer).toBeInTheDocument();
    await user.click(
      within(drawer).getByRole("button", {
        name: "Close service navigation",
      }),
    );
    expect(
      screen.queryByLabelText("Mobile service navigation"),
    ).not.toBeInTheDocument();
  });

  it("closes the mobile drawer with Escape", async () => {
    const user = userEvent.setup();
    render(<Route53Shell>Content</Route53Shell>);
    await user.click(
      screen.getByRole("button", { name: "Open service navigation" }),
    );

    await user.keyboard("{Escape}");

    expect(
      screen.queryByLabelText("Mobile service navigation"),
    ).not.toBeInTheDocument();
  });

  it("renders placeholder content inside the shell", () => {
    render(
      <Route53Shell>
        <PlaceholderPage
          description="Advanced traffic features."
          title="Traffic policies"
        />
      </Route53Shell>,
    );

    expect(
      screen.getByRole("heading", { name: "Traffic policies", level: 1 }),
    ).toBeInTheDocument();
    expect(screen.getByText("Coming soon")).toBeInTheDocument();
  });

  it("provides a skip link and named navigation landmark", () => {
    render(<Route53Shell>Content</Route53Shell>);

    expect(screen.getByRole("link", { name: "Skip to main content" })).toHaveAttribute(
      "href",
      "#main-content",
    );
    expect(
      screen.getByRole("navigation", {
        name: "Route 53 service navigation",
      }),
    ).toBeInTheDocument();
  });
});
