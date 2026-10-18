import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import SignUpPage from "@/app/signup/page";

describe("SignUpPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    Object.defineProperty(window, "alert", {
      writable: true,
      value: jest.fn(),
    });
  });

  it("renders signup form", () => {
    render(<SignUpPage />);

    expect(
      screen.getByRole("heading", {
        name: /create account/i,
      })
    ).toBeInTheDocument();

    expect(
      screen.getByPlaceholderText(/enter username/i)
    ).toBeInTheDocument();

    expect(
      screen.getByPlaceholderText(/you@example.com/i)
    ).toBeInTheDocument();

    expect(
      screen.getByPlaceholderText(/create a password/i)
    ).toBeInTheDocument();

    expect(
      screen.getByPlaceholderText(/re-enter password/i)
    ).toBeInTheDocument();
  });

  it("updates form fields", async () => {
    const user = userEvent.setup();

    render(<SignUpPage />);

    const username =
      screen.getByPlaceholderText(/enter username/i);

    const email =
      screen.getByPlaceholderText(/you@example.com/i);

    const password =
      screen.getByPlaceholderText(/create a password/i);

    await user.type(username, "john");
    await user.type(email, "john@test.com");
    await user.type(password, "password123");

    expect(username).toHaveValue("john");
    expect(email).toHaveValue("john@test.com");
    expect(password).toHaveValue("password123");
  });

  it("shows error when passwords do not match", async () => {
    const user = userEvent.setup();

    render(<SignUpPage />);

    await user.type(
      screen.getByPlaceholderText(/enter username/i),
      "john"
    );

    await user.type(
      screen.getByPlaceholderText(/you@example.com/i),
      "john@test.com"
    );

    await user.type(
      screen.getByPlaceholderText(/create a password/i),
      "password123"
    );

    await user.type(
      screen.getByPlaceholderText(/re-enter password/i),
      "different123"
    );

    await user.click(
      screen.getByRole("button", {
        name: /sign up/i,
      })
    );

    expect(window.alert).toHaveBeenCalledWith(
      "Passwords do not match"
    );

    expect(fetch).not.toHaveBeenCalled();
  });

  it("submits registration successfully", async () => {
    const user = userEvent.setup();

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
    });

    delete (window as any).location;

    (window as any).location = {
      href: "",
    };

    render(<SignUpPage />);

    await user.type(
      screen.getByPlaceholderText(/enter username/i),
      "john"
    );

    await user.type(
      screen.getByPlaceholderText(/you@example.com/i),
      "john@test.com"
    );

    await user.type(
      screen.getByPlaceholderText(/create a password/i),
      "password123"
    );

    await user.type(
      screen.getByPlaceholderText(/re-enter password/i),
      "password123"
    );

    await user.click(
      screen.getByRole("button", {
        name: /sign up/i,
      })
    );

    await waitFor(() => {
      expect(fetch).toHaveBeenCalled();
    });

    expect(window.alert).toHaveBeenCalledWith(
      "Registration successful! Please log in."
    );

    expect(window.location.href).toBe("/login");
  });

  it("shows backend error message", async () => {
    const user = userEvent.setup();

    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      json: async () => ({
        detail: "Username already exists",
      }),
    });

    render(<SignUpPage />);

    await user.type(
      screen.getByPlaceholderText(/enter username/i),
      "john"
    );

    await user.type(
      screen.getByPlaceholderText(/you@example.com/i),
      "john@test.com"
    );

    await user.type(
      screen.getByPlaceholderText(/create a password/i),
      "password123"
    );

    await user.type(
      screen.getByPlaceholderText(/re-enter password/i),
      "password123"
    );

    await user.click(
      screen.getByRole("button", {
        name: /sign up/i,
      })
    );

    await waitFor(() => {
      expect(window.alert).toHaveBeenCalledWith(
        "Username already exists"
      );
    });
  });

  it("shows generic error when request fails", async () => {
    const user = userEvent.setup();

    global.fetch = jest
      .fn()
      .mockRejectedValue(new Error("Network Error"));

    render(<SignUpPage />);

    await user.type(
      screen.getByPlaceholderText(/enter username/i),
      "john"
    );

    await user.type(
      screen.getByPlaceholderText(/you@example.com/i),
      "john@test.com"
    );

    await user.type(
      screen.getByPlaceholderText(/create a password/i),
      "password123"
    );

    await user.type(
      screen.getByPlaceholderText(/re-enter password/i),
      "password123"
    );

    await user.click(
      screen.getByRole("button", {
        name: /sign up/i,
      })
    );

    await waitFor(() => {
      expect(window.alert).toHaveBeenCalledWith(
        "Something went wrong"
      );
    });
  });

  it("renders login link", () => {
    render(<SignUpPage />);

    expect(
      screen.getByRole("link", {
        name: /log in/i,
      })
    ).toHaveAttribute("href", "/login");
  });
});