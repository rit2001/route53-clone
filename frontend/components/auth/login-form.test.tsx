import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { ApiError } from "@/lib/api/errors";

import { LoginForm } from "./login-form";

const navigationMocks = vi.hoisted(() => ({
  replace: vi.fn(),
  next: null as string | null,
}));
const authMocks = vi.hoisted(() => ({
  login: vi.fn(),
  logout: vi.fn(),
  status: "unauthenticated" as
    | "loading"
    | "authenticated"
    | "unauthenticated",
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: navigationMocks.replace }),
  useSearchParams: () =>
    new URLSearchParams(
      navigationMocks.next ? { next: navigationMocks.next } : undefined,
    ),
}));

vi.mock("@/components/auth/auth-provider", () => ({
  useAuth: () => ({
    user: null,
    accessToken: null,
    status: authMocks.status,
    login: authMocks.login,
    logout: authMocks.logout,
  }),
}));

describe("LoginForm", () => {
  beforeEach(() => {
    authMocks.status = "unauthenticated";
    authMocks.login.mockReset();
    navigationMocks.replace.mockReset();
    navigationMocks.next = null;
  });

  it("validates the email address", async () => {
    const user = userEvent.setup();
    render(<LoginForm />);

    await user.type(screen.getByLabelText("Email"), "not-an-email");
    await user.type(screen.getByLabelText("Password"), "password");
    await user.click(screen.getByRole("button", { name: "Sign in" }));

    expect(
      await screen.findByText("Enter a valid email address."),
    ).toBeInTheDocument();
    expect(authMocks.login).not.toHaveBeenCalled();
  });

  it("requires a password", async () => {
    const user = userEvent.setup();
    render(<LoginForm />);

    await user.type(screen.getByLabelText("Email"), "demo@route53.local");
    await user.click(screen.getByRole("button", { name: "Sign in" }));

    expect(await screen.findByText("Enter your password.")).toBeInTheDocument();
  });

  it("fills but does not submit the demo credentials", async () => {
    const user = userEvent.setup();
    render(<LoginForm />);

    await user.click(
      screen.getByRole("button", { name: "Use demo credentials" }),
    );

    expect(screen.getByLabelText("Email")).toHaveValue("demo@route53.local");
    expect(screen.getByLabelText("Password")).toHaveValue(
      "Route53Demo123!",
    );
    expect(authMocks.login).not.toHaveBeenCalled();
  });

  it("toggles password visibility", async () => {
    const user = userEvent.setup();
    render(<LoginForm />);
    const password = screen.getByLabelText("Password");

    expect(password).toHaveAttribute("type", "password");
    await user.click(screen.getByRole("button", { name: "Show password" }));
    expect(password).toHaveAttribute("type", "text");
    await user.click(screen.getByRole("button", { name: "Hide password" }));
    expect(password).toHaveAttribute("type", "password");
  });

  it("submits valid credentials and redirects", async () => {
    const user = userEvent.setup();
    authMocks.login.mockResolvedValue(undefined);
    render(<LoginForm />);

    await user.click(
      screen.getByRole("button", { name: "Use demo credentials" }),
    );
    await user.click(screen.getByRole("button", { name: "Sign in" }));

    await waitFor(() =>
      expect(authMocks.login).toHaveBeenCalledWith({
        email: "demo@route53.local",
        password: "Route53Demo123!",
      }),
    );
    expect(navigationMocks.replace).toHaveBeenCalledWith(
      "/route53/dashboard",
    );
  });

  it("shows a loading state while submitting", async () => {
    const user = userEvent.setup();
    authMocks.login.mockReturnValue(new Promise(() => undefined));
    render(<LoginForm />);

    await user.click(
      screen.getByRole("button", { name: "Use demo credentials" }),
    );
    await user.click(screen.getByRole("button", { name: "Sign in" }));

    expect(
      await screen.findByRole("button", { name: /Signing in/ }),
    ).toBeDisabled();
  });

  it("shows invalid credentials in an accessible alert", async () => {
    const user = userEvent.setup();
    authMocks.login.mockRejectedValue(
      new ApiError(
        401,
        "INVALID_CREDENTIALS",
        "The email or password is incorrect.",
      ),
    );
    render(<LoginForm />);

    await user.click(
      screen.getByRole("button", { name: "Use demo credentials" }),
    );
    await user.click(screen.getByRole("button", { name: "Sign in" }));

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("The email or password is incorrect.");
  });

  it("submits when Enter is pressed in the form", async () => {
    const user = userEvent.setup();
    authMocks.login.mockResolvedValue(undefined);
    render(<LoginForm />);

    await user.type(screen.getByLabelText("Email"), "demo@route53.local");
    await user.type(
      screen.getByLabelText("Password"),
      "Route53Demo123!{Enter}",
    );

    await waitFor(() => expect(authMocks.login).toHaveBeenCalledOnce());
  });

  it("redirects an already authenticated user", async () => {
    authMocks.status = "authenticated";
    render(<LoginForm />);

    await waitFor(() =>
      expect(navigationMocks.replace).toHaveBeenCalledWith(
        "/route53/dashboard",
      ),
    );
  });

  it("honours a safe internal next destination", async () => {
    const user = userEvent.setup();
    navigationMocks.next = "/route53/hosted-zones?search=example";
    authMocks.login.mockResolvedValue(undefined);
    render(<LoginForm />);

    await user.click(
      screen.getByRole("button", { name: "Use demo credentials" }),
    );
    await user.click(screen.getByRole("button", { name: "Sign in" }));

    await waitFor(() =>
      expect(navigationMocks.replace).toHaveBeenCalledWith(
        "/route53/hosted-zones?search=example",
      ),
    );
  });

  it("rejects external next destinations", async () => {
    const user = userEvent.setup();
    navigationMocks.next = "//attacker.example/steal";
    authMocks.login.mockResolvedValue(undefined);
    render(<LoginForm />);

    await user.click(
      screen.getByRole("button", { name: "Use demo credentials" }),
    );
    await user.click(screen.getByRole("button", { name: "Sign in" }));

    await waitFor(() =>
      expect(navigationMocks.replace).toHaveBeenCalledWith(
        "/route53/dashboard",
      ),
    );
  });
});
