import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ChatHistory from "@/app/chat_history/page";

const pushMock = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: pushMock,
  }),
}));

describe("ChatHistory", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    Storage.prototype.setItem = jest.fn();
  });

  it("renders heading", () => {
    global.fetch = jest.fn().mockResolvedValue({
      json: async () => [],
    });

    render(<ChatHistory />);

    expect(
      screen.getByRole("heading", {
        name: /chat history/i,
      })
    ).toBeInTheDocument();
  });

  it("shows loading state initially", () => {
    global.fetch = jest.fn(
      () =>
        new Promise(() => {
          // never resolves
        })
    );

    render(<ChatHistory />);

    expect(
      screen.getByText(/loading/i)
    ).toBeInTheDocument();
  });

  it("shows empty state", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      json: async () => [],
    });

    render(<ChatHistory />);

    expect(
      await screen.findByText(
        /no conversations yet/i
      )
    ).toBeInTheDocument();
  });

  it("renders conversations", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      json: async () => [
        {
          id: "123",
          username: "john",
          created_at: "2025-01-01T00:00:00Z",
          last_updated: "2025-01-02T00:00:00Z",
        },
      ],
    });

    render(<ChatHistory />);

    expect(
      await screen.findByText(
        /conversation with john/i
      )
    ).toBeInTheDocument();
  });

  it("loads conversations on mount", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      json: async () => [],
    });

    render(<ChatHistory />);

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        "http://localhost:8000/chat/conversations"
      );
    });
  });

  it("opens conversation when clicked", async () => {
    const user = userEvent.setup();

    global.fetch = jest.fn().mockResolvedValue({
      json: async () => [
        {
          id: "abc123",
          username: "john",
          created_at: "2025-01-01T00:00:00Z",
          last_updated: "2025-01-01T00:00:00Z",
        },
      ],
    });

    render(<ChatHistory />);

    const conversation =
      await screen.findByText(
        /conversation with john/i
      );

    await user.click(conversation);

    expect(localStorage.setItem).toHaveBeenCalledWith(
      "open_conversation_id",
      "abc123"
    );

    expect(pushMock).toHaveBeenCalledWith(
      "/chat"
    );
  });

  it("handles fetch errors", async () => {
    const consoleSpy = jest
      .spyOn(console, "error")
      .mockImplementation(() => {});

    global.fetch = jest.fn().mockRejectedValue(
      new Error("Failed")
    );

    render(<ChatHistory />);

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalled();
    });

    consoleSpy.mockRestore();
  });
});