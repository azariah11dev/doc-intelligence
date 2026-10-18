import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import LoginPage from "@/app/(public)/login/page";

const mockPush = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

describe("LoginPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    Object.defineProperty(window, "alert", {
      writable: true,
      value: jest.fn(),
    });

    Storage.prototype.setItem = jest.fn();
  });

  it("renders login form", () => {
    render(<LoginPage />);

    expect(
      screen.getByRole("heading", { name: /login/i })
    ).toBeInTheDocument();

    expect(
      screen.getByPlaceholderText(/enter username/i)
    ).toBeInTheDocument();

    expect(
      screen.getByPlaceholderText(/enter password/i)
    ).toBeInTheDocument();

    expect(
      screen.getByRole("button", { name: /sign in/i })
    ).toBeInTheDocument();
  });

  it("updates form fields", async () => {
    const user = userEvent.setup();

    render(<LoginPage />);

    const username =
      screen.getByPlaceholderText(/enter username/i);

    const password =
      screen.getByPlaceholderText(/enter password/i);

    await user.type(username, "testuser");
    await user.type(password, "password123");

    expect(username).toHaveValue("testuser");
    expect(password).toHaveValue("password123");
  });

  it("submits credentials successfully", async () => {
    const user = userEvent.setup();

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        access_token: "token123",
        username: "testuser",
        role: "user",
        email: "test@test.com",
      }),
    });

    render(<LoginPage />);

    await user.type(
      screen.getByPlaceholderText(/enter username/i),
      "testuser"
    );

    await user.type(
      screen.getByPlaceholderText(/enter password/i),
      "password123"
    );

    await user.click(
      screen.getByRole("button", {
        name: /sign in/i,
      })
    );

    await waitFor(() => {
      expect(fetch).toHaveBeenCalled();
    });

    expect(localStorage.setItem).toHaveBeenCalledWith(
      "access_token",
      "token123"
    );

    expect(localStorage.setItem).toHaveBeenCalledWith(
      "username",
      "testuser"
    );

    expect(mockPush).toHaveBeenCalledWith("/dashboard");
  });

  it("shows api error message", async () => {
    const user = userEvent.setup();

    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      json: async () => ({
        detail: "Invalid username or password",
      }),
    });

    render(<LoginPage />);

    await user.type(
      screen.getByPlaceholderText(/enter username/i),
      "baduser"
    );

    await user.type(
      screen.getByPlaceholderText(/enter password/i),
      "badpass"
    );

    await user.click(
      screen.getByRole("button", {
        name: /sign in/i,
      })
    );

    await waitFor(() => {
      expect(window.alert).toHaveBeenCalledWith(
        "Invalid username or password"
      );
    });
  });

  it("shows generic error when request throws", async () => {
    const user = userEvent.setup();

    global.fetch = jest.fn().mockRejectedValue(
      new Error("Network Error")
    );

    render(<LoginPage />);

    await user.type(
      screen.getByPlaceholderText(/enter username/i),
      "user"
    );

    await user.type(
      screen.getByPlaceholderText(/enter password/i),
      "pass"
    );

    await user.click(
      screen.getByRole("button", {
        name: /sign in/i,
      })
    );

    await waitFor(() => {
      expect(window.alert).toHaveBeenCalledWith(
        "Something went wrong"
      );
    });
  });

  it("renders signup link", () => {
    render(<LoginPage />);

    expect(
      screen.getByRole("link", {
        name: /sign up/i,
      })
    ).toHaveAttribute("href", "/signup");
  });

  it("applies background image", () => {
    const { container } = render(<LoginPage />);

    const root = container.firstChild as HTMLElement;

    expect(root).toHaveStyle({
      backgroundImage: "url('/authPage.jpg')",
    });
  });
});