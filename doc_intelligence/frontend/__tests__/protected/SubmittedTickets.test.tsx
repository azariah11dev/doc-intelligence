import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import SubmittedTickets from "@/app/(protected)/submitted_tickets/page";

jest.mock("next/link", () => {
  return ({ children, href }: any) => (
    <a href={href}>{children}</a>
  );
});

describe("SubmittedTickets", () => {
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
    status: "open",
    filepath: "/tmp/error.png",
  };

  it("renders page heading", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => [],
    });

    render(<SubmittedTickets />);

    expect(
      screen.getByRole("heading", {
        name: /open tickets/i,
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

    render(<SubmittedTickets />);

    expect(
      screen.getByText(/loading tickets/i)
    ).toBeInTheDocument();
  });

  it("shows empty state", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => [],
    });

    render(<SubmittedTickets />);

    expect(
      await screen.findByText(/no open tickets/i)
    ).toBeInTheDocument();
  });

  it("renders tickets", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => [mockTicket],
    });

    render(<SubmittedTickets />);

    expect(
      await screen.findByText("john")
    ).toBeInTheDocument();

    expect(
      screen.getByText("john@test.com")
    ).toBeInTheDocument();

    expect(
      screen.getByText("Cannot login")
    ).toBeInTheDocument();
  });

  it("loads tickets on mount", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => [],
    });

    render(<SubmittedTickets />);

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        "http://localhost:8000/contact/open_tickets",
        { method: "GET" }
      );
    });
  });

  it("updates ticket status", async () => {
    const user = userEvent.setup();

    global.fetch = jest
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [mockTicket],
      })
      .mockResolvedValueOnce({
        ok: true,
      });

    render(<SubmittedTickets />);

    const select = await screen.findByRole("combobox");

    await user.selectOptions(
      select,
      "completed"
    );

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledTimes(2);
    });
  });

  it("opens attachment", async () => {
    const user = userEvent.setup();

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => [mockTicket],
    });

    render(<SubmittedTickets />);

    const viewButton =
      await screen.findByRole("button", {
        name: /view/i,
      });

    await user.click(viewButton);

    expect(window.open).toHaveBeenCalledWith(
      "http://localhost:8000/contact/tickets/files/error.png",
      "_blank",
      "noopener,noreferrer"
    );
  });

  it("shows alert when attachment missing", async () => {
    const user = userEvent.setup();

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => [
        {
          ...mockTicket,
          filepath: null,
        },
      ],
    });

    render(<SubmittedTickets />);

    const button =
      await screen.findByRole("button", {
        name: /view/i,
      });

    expect(button).toBeDisabled();
  });

  it("shows fetch error", async () => {
    global.fetch = jest.fn().mockRejectedValue(
      new Error("Server Down")
    );

    render(<SubmittedTickets />);

    expect(
      await screen.findByText(/server down/i)
    ).toBeInTheDocument();
  });

  it("renders navigation links", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => [],
    });

    render(<SubmittedTickets />);

    expect(
      screen.getByRole("link", {
        name: /back/i,
      })
    ).toHaveAttribute("href", "/ticket");

    expect(
      screen.getByRole("link", {
        name: /view all/i,
      })
    ).toHaveAttribute("href", "/view_all");
  });
});