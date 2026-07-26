import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { ApiError } from "@/lib/api/errors";

import { HostedZoneForm } from "./hosted-zone-form";

const mocks = vi.hoisted(() => ({
  push: vi.fn(),
  mutation: {
    mutateAsync: vi.fn(),
    isPending: false,
    error: null as unknown,
  },
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mocks.push }),
}));

vi.mock("@/hooks/hosted-zones/queries", () => ({
  useCreateHostedZone: () => mocks.mutation,
}));

const createdZone = {
  id: "ZCREATED",
  name: "example.com.",
  comment: "Public website",
  zone_type: "PUBLIC" as const,
  record_count: 2,
  name_servers: ["ns-1.mock.invalid."],
  created_at: "2026-07-26T10:00:00Z",
  updated_at: "2026-07-26T10:00:00Z",
};

describe("HostedZoneForm", () => {
  beforeEach(() => {
    mocks.push.mockReset();
    mocks.mutation.mutateAsync.mockReset();
    mocks.mutation.isPending = false;
    mocks.mutation.error = null;
  });

  it("requires a domain name", async () => {
    const user = userEvent.setup();
    render(<HostedZoneForm />);
    await user.click(
      screen.getByRole("button", { name: "Create hosted zone" }),
    );
    expect(await screen.findByText("Enter a domain name.")).toBeInTheDocument();
    expect(mocks.mutation.mutateAsync).not.toHaveBeenCalled();
  });

  it("validates the description length", async () => {
    const user = userEvent.setup();
    render(<HostedZoneForm />);
    await user.type(screen.getByLabelText("Domain name"), "example.com");
    fireEvent.change(screen.getByLabelText(/Description/), {
      target: { value: "x".repeat(257) },
    });
    await user.click(
      screen.getByRole("button", { name: "Create hosted zone" }),
    );
    expect(
      await screen.findByText("Description must be 256 characters or fewer."),
    ).toBeInTheDocument();
  });

  it("defaults to a public hosted zone", () => {
    render(<HostedZoneForm />);
    expect(screen.getByLabelText(/Public hosted zone/)).toBeChecked();
    expect(screen.getByLabelText(/Private hosted zone/)).not.toBeChecked();
  });

  it("shows the mocked-network notice for private zones", async () => {
    const user = userEvent.setup();
    render(<HostedZoneForm />);
    await user.click(screen.getByLabelText(/Private hosted zone/));
    expect(
      screen.getByText(/No real VPC will be created/),
    ).toBeInTheDocument();
  });

  it("navigates back when cancelled", async () => {
    const user = userEvent.setup();
    render(<HostedZoneForm />);
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(mocks.push).toHaveBeenCalledWith("/route53/hosted-zones");
  });

  it("submits the exact backend contract and navigates to details", async () => {
    const user = userEvent.setup();
    mocks.mutation.mutateAsync.mockResolvedValue(createdZone);
    render(<HostedZoneForm />);
    await user.type(screen.getByLabelText("Domain name"), "  Example.COM  ");
    await user.type(screen.getByLabelText(/Description/), "  Public website  ");
    await user.click(
      screen.getByRole("button", { name: "Create hosted zone" }),
    );

    await waitFor(() =>
      expect(mocks.mutation.mutateAsync).toHaveBeenCalledWith({
        name: "Example.COM",
        comment: "Public website",
        zone_type: "PUBLIC",
      }),
    );
    expect(mocks.push).toHaveBeenCalledWith(
      "/route53/hosted-zones/ZCREATED",
    );
  });

  it("disables actions while creating", () => {
    mocks.mutation.isPending = true;
    render(<HostedZoneForm />);
    expect(
      screen.getByRole("button", { name: /Create hosted zone/ }),
    ).toBeDisabled();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeDisabled();
  });

  it("maps duplicate errors clearly", () => {
    mocks.mutation.error = new ApiError(
      409,
      "HOSTED_ZONE_ALREADY_EXISTS",
      "Raw duplicate response.",
    );
    render(<HostedZoneForm />);
    expect(
      screen.getByText(
        "A hosted zone with this name and type already exists.",
      ),
    ).toBeInTheDocument();
  });

  it("shows backend validation and network errors safely", () => {
    mocks.mutation.error = new ApiError(
      0,
      "NETWORK_ERROR",
      "Unable to reach API.",
    );
    const view = render(<HostedZoneForm />);
    expect(screen.getByText(/API is unreachable/)).toBeInTheDocument();

    mocks.mutation.error = new ApiError(
      422,
      "VALIDATION_ERROR",
      "Domain labels cannot begin with a hyphen.",
    );
    view.rerender(<HostedZoneForm />);
    expect(
      screen.getByText("Domain labels cannot begin with a hyphen."),
    ).toBeInTheDocument();
  });

  it("preserves values after failed submission", async () => {
    const user = userEvent.setup();
    mocks.mutation.mutateAsync.mockRejectedValue(new Error("failed"));
    render(<HostedZoneForm />);
    await user.type(screen.getByLabelText("Domain name"), "example.com");
    await user.type(screen.getByLabelText(/Description/), "Keep this value");
    await user.click(
      screen.getByRole("button", { name: "Create hosted zone" }),
    );
    await waitFor(() => expect(mocks.mutation.mutateAsync).toHaveBeenCalled());
    expect(screen.getByLabelText("Domain name")).toHaveValue("example.com");
    expect(screen.getByLabelText(/Description/)).toHaveValue("Keep this value");
  });

  it("prevents a double submission while the first request is pending", async () => {
    const user = userEvent.setup();
    mocks.mutation.mutateAsync.mockReturnValue(new Promise(() => undefined));
    render(<HostedZoneForm />);
    await user.type(screen.getByLabelText("Domain name"), "example.com");
    const submit = screen.getByRole("button", { name: "Create hosted zone" });
    await user.dblClick(submit);
    expect(mocks.mutation.mutateAsync).toHaveBeenCalledOnce();
    expect(
      screen.getByRole("button", { name: /Create hosted zone/ }),
    ).toBeDisabled();
  });
});
