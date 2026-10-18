import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import SideBar from "@/app/comps/SideBar";

jest.mock("next/link", () => {
  return ({ children, href, onClick }: any) => (
    <a href={href} onClick={onClick}>
      {children}
    </a>
  );
});

jest.mock("@heroicons/react/24/outline", () => ({
  ComputerDesktopIcon: () => <div data-testid="dashboard-icon" />,
  FolderIcon: () => <div data-testid="folder-icon" />,
  ChatBubbleOvalLeftEllipsisIcon: () => <div data-testid="chat-icon" />,
  ChatBubbleLeftRightIcon: () => <div data-testid="history-icon" />,
  UserGroupIcon: () => <div data-testid="users-icon" />,
  TicketIcon: () => <div data-testid="ticket-icon" />,
  ArrowLeftStartOnRectangleIcon: () => (
    <div data-testid="logout-icon" />
  ),
}));

describe("SideBar", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    Storage.prototype.getItem = jest.fn((key) => {
      switch (key) {
        case "username":
          return "john";
        case "role":
          return "Admin";
        default:
          return null;
      }
    });

    Storage.prototype.removeItem = jest.fn();

    delete (window as any).location;

    (window as any).location = {
      assign: jest.fn(),
    };
  });

  it("renders username and role", async () => {
    render(<SideBar />);

    expect(
      await screen.findByText(/john \(admin\)/i)
    ).toBeInTheDocument();
  });

  it("renders common navigation links", () => {
    render(<SideBar />);

    expect(
      screen.getByRole("link", {
        name: /dashboard/i,
      })
    ).toHaveAttribute("href", "/dashboard");

    expect(
      screen.getByRole("link", {
        name: /^documents$/i,
      })
    ).toHaveAttribute("href", "/documents");

    expect(
      screen.getByRole("link", {
        name: /^chat$/i,
      })
    ).toHaveAttribute("href", "/chat");

    expect(
      screen.getByRole("link", {
        name: /chat history/i,
      })
    ).toHaveAttribute("href", "/chat_history");

    expect(
      screen.getByRole("link", {
        name: /ticket/i,
      })
    ).toHaveAttribute("href", "/ticket");
  });

  it("shows user roles link for admins", async () => {
    render(<SideBar />);

    expect(
      await screen.findByRole("link", {
        name: /user roles/i,
      })
    ).toHaveAttribute("href", "/user-roles");
  });

  it("hides user roles link for normal users", async () => {
    Storage.prototype.getItem = jest.fn((key) => {
      if (key === "username") return "john";
      if (key === "role") return "User";
      return null;
    });

    render(<SideBar />);

    await waitFor(() => {
      expect(
        screen.queryByRole("link", {
          name: /user roles/i,
        })
      ).not.toBeInTheDocument();
    });
  });

  it("logs out correctly", async () => {
    const user = userEvent.setup();

    render(<SideBar />);

    await user.click(
      screen.getByRole("link", {
        name: /logout/i,
      })
    );

    expect(localStorage.removeItem).toHaveBeenCalledWith(
      "username"
    );

    expect(localStorage.removeItem).toHaveBeenCalledWith(
      "role"
    );

    expect(localStorage.removeItem).toHaveBeenCalledWith(
      "access_token"
    );

    expect(window.location.assign).toHaveBeenCalledWith(
      "/login"
    );
  });

  it("renders date/time section", async () => {
    render(<SideBar />);

    await waitFor(() => {
      expect(
        screen.getByText((content) =>
          content.includes("•")
        )
      ).toBeInTheDocument();
    });
  });
});