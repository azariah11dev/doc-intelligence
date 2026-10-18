import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ViewAll from "@/app/view_all/page";

jest.mock("next/link", () => {
  return ({ children, href }: any) => (
    <a href={href}>{children}</a>
  );
});

describe("ViewAll", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    window.open = jest.fn();

    Object.defineProperty(window, "alert", {
      writable: true,
      value: jest.fn(),
    });
  });

  const mockTicket = {
    id: "1",
    username: "john",
    email: "john@test.com",
    subject: "login_issue",
    description: "Cannot login",
    priority: "high",
    status: "completed",
    filepath: "/tmp/error.png",
  };

  it("renders heading", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => [],
    });

    render(<ViewAll />);

    expect(
      screen.getByRole("heading", {
        name: /all tickets/i,
      })
    ).toBeInTheDocument();
  });

  it("shows loading state", () => {
    global.fetch = jest.fn(
      () =>
        new Promise(() => {
          /* never resolves */
        })
    );

    render(<ViewAll />);

    expect(
      screen.getByText(/loading tickets/i)
    ).toBeInTheDocument();
  });

  it("shows empty state", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => [],
    });

    render(<ViewAll />);

    expect(
      await screen.findByText(/no tickets yet/i)
    ).toBeInTheDocument();
  });

  it("renders tickets", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => [mockTicket],
    });

    render(<ViewAll />);

    expect(
      await screen.findByText("john")
    ).toBeInTheDocument();

    expect(
      screen.getByText("john@test.com")
    ).toBeInTheDocument();

    expect(
      screen.getByText("Cannot login")
    ).toBeInTheDocument();

    expect(
      screen.getByText("completed")
    ).toBeInTheDocument();
  });

  it("loads tickets on mount", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => [],
    });

    render(<ViewAll />);

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        "http://localhost:8000/contact/all_tickets",
        {
          method: "GET",
        }
      );
    });
  });

  it("opens attachment", async () => {
    const user = userEvent.setup();

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => [mockTicket],
    });

    render(<ViewAll />);

    const button =
      await screen.findByRole("button", {
        name: /view/i,
      });

    await user.click(button);

    expect(window.open).toHaveBeenCalledWith(
      "http://localhost:8000/contact/tickets/files/error.png",
      "_blank",
      "noopener,noreferrer"
    );
  });

  it("disables attachment button when file missing", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => [
        {
          ...mockTicket,
          filepath: null,
        },
      ],
    });

    render(<ViewAll />);

    const button =
      await screen.findByRole("button", {
        name: /view/i,
      });

    expect(button).toBeDisabled();
  });

  it("shows error state", async () => {
    global.fetch = jest.fn().mockRejectedValue(
      new Error("Backend offline")
    );

    render(<ViewAll />);

    expect(
      await screen.findByText(/backend offline/i)
    ).toBeInTheDocument();
  });

  it("renders back link", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => [],
    });

    render(<ViewAll />);

    expect(
      screen.getByRole("link", {
        name: /back/i,
      })
    ).toHaveAttribute(
      "href",
      "/submitted_tickets"
    );
  });
});