import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Chat from "@/app/(protected)/chat/page";
import { TextDecoder, TextEncoder } from "util";

Object.assign(global, { TextDecoder, TextEncoder });

jest.mock("../../src/app/(protected)/comps/model_provider.json", () => ({
  "qwen3.8:27b": "ollama",
  "claude-sonnet": "claude",
}));

jest.mock("@heroicons/react/24/outline", () => ({
  LightBulbIcon: () => <div data-testid="bulb-icon" />,
  ChatBubbleOvalLeftIcon: () => <div data-testid="chat-icon" />,
  EyeIcon: () => <div data-testid="eye-icon" />,
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

  describe("streaming", () => {
    const THINK_START = "\u0002";
    const THINK_END = "\u0003";

    function mockStream(chunks: string[]) {
      const encoder = new TextEncoder();
      const queue = chunks.map((chunk) => encoder.encode(chunk));
      const reader = {
        read: jest.fn(async () =>
          queue.length
            ? { done: false, value: queue.shift() }
            : { done: true, value: undefined }
        ),
      };
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        body: { getReader: () => reader },
      });
    }

    async function sendQuestion(user: ReturnType<typeof userEvent.setup>) {
      await user.type(
        screen.getByPlaceholderText(/chat with your documents/i),
        "hello"
      );
      await user.click(screen.getByRole("button", { name: /send/i }));
    }

    it("shows reasoning separately from the answer", async () => {
      mockStream([
        THINK_START,
        "weighing the sources",
        THINK_END,
        "The answer is 42.",
      ]);
      const user = userEvent.setup();
      render(<Chat />);

      await sendQuestion(user);

      expect(await screen.findByText("The answer is 42.")).toBeInTheDocument();
      expect(screen.getByText("weighing the sources")).toBeInTheDocument();
      expect(screen.getByText("Reasoning")).toBeInTheDocument();
    });

    it("handles markers merged into one network chunk", async () => {
      mockStream([`${THINK_START}merged thought${THINK_END}Merged answer`]);
      const user = userEvent.setup();
      render(<Chat />);

      await sendQuestion(user);

      expect(await screen.findByText("Merged answer")).toBeInTheDocument();
      expect(screen.getByText("merged thought")).toBeInTheDocument();
    });

    it("sends the deep reasoning choice to the API", async () => {
      mockStream(["ok"]);
      const user = userEvent.setup();
      render(<Chat />);

      const toggle = screen.getByRole("button", { name: /deep reasoning off/i });
      expect(toggle).toHaveAttribute("aria-pressed", "false");

      await user.click(toggle);
      expect(
        screen.getByRole("button", { name: /deep reasoning on/i })
      ).toHaveAttribute("aria-pressed", "true");
      await sendQuestion(user);

      await waitFor(() => expect(global.fetch).toHaveBeenCalled());
      const body = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body);
      expect(body.think).toBe(true);
    });

    it("defaults deep reasoning to off", async () => {
      mockStream(["ok"]);
      const user = userEvent.setup();
      render(<Chat />);

      await sendQuestion(user);

      await waitFor(() => expect(global.fetch).toHaveBeenCalled());
      const body = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body);
      expect(body.think).toBe(false);
    });
  });
});