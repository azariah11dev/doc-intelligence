import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Chat from "@/app/chat/page";

jest.mock("../comps/model_provider.json", () => ({
  "qwen3.8:27b": "ollama",
  "claude-sonnet": "claude",
}));

jest.mock("@heroicons/react/24/outline", () => ({
  LightBulbIcon: () => <div data-testid="bulb-icon" />,
  ChatBubbleOvalLeftIcon: () => <div data-testid="chat-icon" />,
}));

beforeAll(() => {
  Element.prototype.scrollIntoView = jest.fn();
});

describe("Chat", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    Object.defineProperty(window, "alert", {
      writable: true,
      value: jest.fn(),
    });

    Storage.prototype.getItem = jest.fn();
    Storage.prototype.setItem = jest.fn();
    Storage.prototype.removeItem = jest.fn();
  });

  it("renders chat input", () => {
    render(<Chat />);

    expect(
      screen.getByPlaceholderText(
        /chat with your documents/i
      )
    ).toBeInTheDocument();

    expect(
      screen.getByRole("button", {
        name: /send/i,
      })
    ).toBeInTheDocument();
  });

  it("updates textarea value", async () => {
    const user = userEvent.setup();

    render(<Chat />);

    const input = screen.getByPlaceholderText(
      /chat with your documents/i
    );

    await user.type(input, "hello");

    expect(input).toHaveValue("hello");
  });

  it("toggles accuracy mode", async () => {
    const user = userEvent.setup();

    render(<Chat />);

    const accuracyButton = screen.getByRole("button", {
      name: /accuracy on/i,
    });

    await user.click(accuracyButton);

    expect(
      screen.getByRole("button", {
        name: /accuracy off/i,
      })
    ).toBeInTheDocument();
  });

  it("changes models", async () => {
    const user = userEvent.setup();

    render(<Chat />);

    const select = screen.getByLabelText(
      /choose a model/i
    );

    await user.selectOptions(
      select,
      "claude-sonnet"
    );

    expect(select).toHaveValue("claude-sonnet");
  });

  it("shows alert for unsupported provider", async () => {
    const user = userEvent.setup();

    render(<Chat />);

    await user.selectOptions(
      screen.getByLabelText(/choose a model/i),
      "claude-sonnet"
    );

    await user.type(
      screen.getByPlaceholderText(
        /chat with your documents/i
      ),
      "hello"
    );

    await user.click(
      screen.getByRole("button", {
        name: /send/i,
      })
    );

    expect(window.alert).toHaveBeenCalled();
  });

  it("does not send empty question", async () => {
    global.fetch = jest.fn();

    const user = userEvent.setup();

    render(<Chat />);

    await user.click(
      screen.getByRole("button", {
        name: /send/i,
      })
    );

    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("clears messages with new chat", async () => {
    const user = userEvent.setup();

    render(<Chat />);

    const newChatButton = screen.getByRole("button", {
      name: /new chat/i,
    });

    await user.click(newChatButton);

    expect(
      localStorage.removeItem
    ).toHaveBeenCalledWith(
      "conversation_id"
    );
  });

  it("loads conversation from localStorage", async () => {
    Storage.prototype.getItem = jest
      .fn()
      .mockReturnValue("conversation123");

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        messages: [
          {
            query: "question",
            response: "answer",
          },
        ],
      }),
    });

    render(<Chat />);

    await waitFor(() => {
      expect(fetch).toHaveBeenCalled();
    });

    expect(
      await screen.findByText("question")
    ).toBeInTheDocument();

    expect(
      await screen.findByText("answer")
    ).toBeInTheDocument();
  });
});