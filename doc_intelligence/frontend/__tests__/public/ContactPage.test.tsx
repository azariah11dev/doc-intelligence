import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ContactPage from "@/app/contact/page";

describe("ContactPage", () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it("renders page content", () => {
    render(<ContactPage />);

    expect(
      screen.getByRole("heading", { name: /contact us/i })
    ).toBeInTheDocument();

    expect(
      screen.getByRole("heading", {
        name: /send a message/i,
      })
    ).toBeInTheDocument();
  });

  it("renders form fields", () => {
    render(<ContactPage />);

    expect(
      screen.getByPlaceholderText(/your name/i)
    ).toBeInTheDocument();

    expect(
      screen.getByPlaceholderText(/you@example.com/i)
    ).toBeInTheDocument();

    expect(
      screen.getByPlaceholderText(/how can we help/i)
    ).toBeInTheDocument();
  });

  it("updates form values", async () => {
    const user = userEvent.setup();

    render(<ContactPage />);

    const nameInput = screen.getByPlaceholderText(/your name/i);
    const emailInput =
      screen.getByPlaceholderText(/you@example.com/i);
    const messageInput =
      screen.getByPlaceholderText(/how can we help/i);

    await user.type(nameInput, "John Doe");
    await user.type(emailInput, "john@test.com");
    await user.type(messageInput, "Hello");

    expect(nameInput).toHaveValue("John Doe");
    expect(emailInput).toHaveValue("john@test.com");
    expect(messageInput).toHaveValue("Hello");
  });

  it("submits successfully", async () => {
    const user = userEvent.setup();

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
    } as Response);

    render(<ContactPage />);

    await user.type(
      screen.getByPlaceholderText(/your name/i),
      "John"
    );

    await user.type(
      screen.getByPlaceholderText(/you@example.com/i),
      "john@test.com"
    );

    await user.type(
      screen.getByPlaceholderText(/how can we help/i),
      "Testing"
    );

    await user.click(
      screen.getByRole("button", {
        name: /send message/i,
      })
    );

    await waitFor(() => {
      expect(
        screen.getByText(/message sent successfully/i)
      ).toBeInTheDocument();
    });

    expect(global.fetch).toHaveBeenCalledWith(
      "http://localhost:8000/contact/",
      expect.objectContaining({
        method: "POST",
      })
    );
  });

  it("shows error message when request fails", async () => {
    const user = userEvent.setup();

    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
    } as Response);

    render(<ContactPage />);

    await user.type(
      screen.getByPlaceholderText(/your name/i),
      "John"
    );

    await user.type(
      screen.getByPlaceholderText(/you@example.com/i),
      "john@test.com"
    );

    await user.type(
      screen.getByPlaceholderText(/how can we help/i),
      "Testing"
    );

    await user.click(
      screen.getByRole("button", {
        name: /send message/i,
      })
    );

    await waitFor(() => {
      expect(
        screen.getByText(/something went wrong/i)
      ).toBeInTheDocument();
    });
  });

  it("resets fields after successful submit", async () => {
    const user = userEvent.setup();

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
    } as Response);

    render(<ContactPage />);

    const nameInput =
      screen.getByPlaceholderText(/your name/i);
    const emailInput =
      screen.getByPlaceholderText(/you@example.com/i);
    const messageInput =
      screen.getByPlaceholderText(/how can we help/i);

    await user.type(nameInput, "John");
    await user.type(emailInput, "john@test.com");
    await user.type(messageInput, "Testing");

    await user.click(
      screen.getByRole("button", {
        name: /send message/i,
      })
    );

    await waitFor(() => {
      expect(nameInput).toHaveValue("");
      expect(emailInput).toHaveValue("");
      expect(messageInput).toHaveValue("");
    });
  });

  it("renders current year in footer", () => {
    render(<ContactPage />);

    const year = new Date().getFullYear();

    expect(
      screen.getByText(
        new RegExp(`© ${year} Doc Intelligence`)
      )
    ).toBeInTheDocument();
  });
});