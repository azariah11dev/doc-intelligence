import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import UserRolesPage from "@/app/user_roles/page";

describe("UserRolesPage", () => {
  const mockUsers = [
    {
      id: "1",
      username: "john",
      email: "john@test.com",
      role: "User",
    },
    {
      id: "2",
      username: "admin",
      email: "admin@test.com",
      role: "Admin",
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();

    Storage.prototype.getItem = jest.fn(() => "token");

    Object.defineProperty(window, "alert", {
      writable: true,
      value: jest.fn(),
    });
  });

  it("renders loading state", () => {
    global.fetch = jest.fn(
      () => new Promise(() => {})
    );

    render(<UserRolesPage />);

    expect(
      screen.getByText(/loading users/i)
    ).toBeInTheDocument();
  });

  it("renders users", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => mockUsers,
    });

    render(<UserRolesPage />);

    expect(
      await screen.findByText("john")
    ).toBeInTheDocument();

    expect(
      screen.getByText("john@test.com")
    ).toBeInTheDocument();

    expect(
      screen.getByText("admin")
    ).toBeInTheDocument();
  });

  it("shows fetch error", async () => {
    global.fetch = jest.fn().mockRejectedValue(
      new Error("Failed")
    );

    render(<UserRolesPage />);

    expect(
      await screen.findByText(
        /could not load users/i
      )
    ).toBeInTheDocument();
  });

  it("updates a role", async () => {
    const user = userEvent.setup();

    global.fetch = jest
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockUsers,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          message: "success",
        }),
      });

    render(<UserRolesPage />);

    const selects = await screen.findAllByRole(
      "combobox"
    );

    await user.selectOptions(
      selects[0],
      "Admin"
    );

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledTimes(2);
    });
  });

  it("handles role update failure", async () => {
    const user = userEvent.setup();

    global.fetch = jest
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockUsers,
      })
      .mockResolvedValueOnce({
        ok: false,
        json: async () => ({
          detail: "Permission denied",
        }),
      });

    render(<UserRolesPage />);

    const selects = await screen.findAllByRole(
      "combobox"
    );

    await user.selectOptions(
      selects[0],
      "Admin"
    );

    await waitFor(() => {
      expect(window.alert).toHaveBeenCalledWith(
        "Error: Permission denied"
      );
    });
  });

  it("opens delete modal", async () => {
    const user = userEvent.setup();

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => mockUsers,
    });

    render(<UserRolesPage />);

    const deleteButtons =
      await screen.findAllByRole("button", {
        name: /delete/i,
      });

    await user.click(deleteButtons[0]);

    expect(
      screen.getByText(/delete user/i)
    ).toBeInTheDocument();
  });

  it("closes delete modal", async () => {
    const user = userEvent.setup();

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => mockUsers,
    });

    render(<UserRolesPage />);

    const deleteButtons =
      await screen.findAllByRole("button", {
        name: /delete/i,
      });

    await user.click(deleteButtons[0]);

    await user.click(
      screen.getByRole("button", {
        name: /cancel/i,
      })
    );

    expect(
      screen.queryByText(/delete user/i)
    ).not.toBeInTheDocument();
  });

  it("deletes user successfully", async () => {
    const user = userEvent.setup();

    global.fetch = jest
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockUsers,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          message: "User deleted",
        }),
      });

    render(<UserRolesPage />);

    const deleteButtons =
      await screen.findAllByRole("button", {
        name: /delete/i,
      });

    await user.click(deleteButtons[0]);

    const modalDelete =
      screen.getAllByRole("button", {
        name: /^delete$/i,
      })[1];

    await user.click(modalDelete);

    await waitFor(() => {
      expect(window.alert).toHaveBeenCalledWith(
        "User deleted"
      );
    });
  });
});