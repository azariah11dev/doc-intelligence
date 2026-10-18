import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import TicketPage from "@/app/(protected)/ticket/page";

jest.mock("next/link", () => {
  return ({ children, href }: any) => (
    <a href={href}>{children}</a>
  );
});

describe("TicketPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    Storage.prototype.getItem = jest.fn((key) => {
      switch (key) {
        case "role":
          return "Admin";
        case "username":
          return "john";
        case "email":
          return "john@test.com";
        default:
          return null;
      }
    });
  });

  it("renders ticket form", () => {
    render(<TicketPage />);

    expect(
      screen.getByRole("heading", {
        name: /raise an it ticket/i,
      })
    ).toBeInTheDocument();

    expect(
      screen.getByLabelText(/subject/i)
    ).toBeInTheDocument();

    expect(
      screen.getByLabelText(/description/i)
    ).toBeInTheDocument();

    expect(
      screen.getByLabelText(/priority/i)
    ).toBeInTheDocument();
  });

  it("shows admin link", async () => {
    render(<TicketPage />);

    expect(
      await screen.findByRole("link", {
        name: /view tickets/i,
      })
    ).toHaveAttribute(
      "href",
      "/submitted_tickets"
    );
  });

  it("hides admin link for normal users", async () => {
    Storage.prototype.getItem = jest.fn((key) => {
      if (key === "role") return "User";
      return null;
    });

    render(<TicketPage />);

    await waitFor(() => {
      expect(
        screen.queryByRole("link", {
          name: /view tickets/i,
        })
      ).not.toBeInTheDocument();
    });
  });

  it("updates form values", async () => {
    const user = userEvent.setup();

    render(<TicketPage />);

    await user.selectOptions(
      screen.getByLabelText(/subject/i),
      "chat"
    );

    await user.type(
      screen.getByLabelText(/description/i),
      "Chat is broken"
    );

    await user.selectOptions(
      screen.getByLabelText(/priority/i),
      "high"
    );

    expect(
      screen.getByLabelText(/description/i)
    ).toHaveValue("Chat is broken");
  });

  it("submits ticket successfully", async () => {
    const user = userEvent.setup();

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
      }),
    });

    render(<TicketPage />);

    await user.selectOptions(
      screen.getByLabelText(/subject/i),
      "chat"
    );

    await user.type(
      screen.getByLabelText(/description/i),
      "Chat issue"
    );

    await user.selectOptions(
      screen.getByLabelText(/priority/i),
      "high"
    );

    await user.click(
      screen.getByRole("button", {
        name: /submit ticket/i,
      })
    );

    expect(
      await screen.findByText(
        /ticket submitted successfully/i
      )
    ).toBeInTheDocument();

    expect(fetch).toHaveBeenCalled();
  });

  it("handles server error", async () => {
    const user = userEvent.setup();

    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      json: async () => ({
        detail: "Backend Error",
      }),
    });

    render(<TicketPage />);

    await user.selectOptions(
      screen.getByLabelText(/subject/i),
      "chat"
    );

    await user.type(
      screen.getByLabelText(/description/i),
      "Chat issue"
    );

    await user.selectOptions(
      screen.getByLabelText(/priority/i),
      "high"
    );

    await user.click(
      screen.getByRole("button", {
        name: /submit ticket/i,
      })
    );

    expect(
      await screen.findByText("Backend Error")
    ).toBeInTheDocument();
  });

  it("handles network error", async () => {
    const user = userEvent.setup();

    global.fetch = jest
      .fn()
      .mockRejectedValue(new Error("Network"));

    render(<TicketPage />);

    await user.selectOptions(
      screen.getByLabelText(/subject/i),
      "chat"
    );

    await user.type(
      screen.getByLabelText(/description/i),
      "Chat issue"
    );

    await user.selectOptions(
      screen.getByLabelText(/priority/i),
      "high"
    );

    await user.click(
      screen.getByRole("button", {
        name: /submit ticket/i,
      })
    );

    expect(
      await screen.findByText(
        /error submitting ticket/i
      )
    ).toBeInTheDocument();
  });

  it("uploads a file", async () => {
    const user = userEvent.setup();

    render(<TicketPage />);

    const fileInput =
      screen.getByLabelText(
        /add relevant attachment/i
      );

    const file = new File(
      ["hello"],
      "test.txt",
      {
        type: "text/plain",
      }
    );

    await user.upload(fileInput, file);

    expect((fileInput as HTMLInputElement).files?.[0]).toBe(file);
  });

  it("resets form after success", async () => {
    const user = userEvent.setup();

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({}),
    });

    render(<TicketPage />);

    const description =
      screen.getByLabelText(/description/i);

    await user.selectOptions(
      screen.getByLabelText(/subject/i),
      "chat"
    );

    await user.type(
      description,
      "test issue"
    );

    await user.selectOptions(
      screen.getByLabelText(/priority/i),
      "high"
    );

    await user.click(
      screen.getByRole("button", {
        name: /submit ticket/i,
      })
    );

    await waitFor(() => {
      expect(description).toHaveValue("");
    });
  });
});