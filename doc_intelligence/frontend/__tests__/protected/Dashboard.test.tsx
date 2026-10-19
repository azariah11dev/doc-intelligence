import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Dashboard from "@/app/(protected)/dashboard/page";

const mockPush = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

describe("Dashboard", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPush.mockClear();

    Storage.prototype.getItem = jest.fn((key) => {
      if (key === "username") return "john";
      return null;
    });

    Object.defineProperty(window, "alert", {
      writable: true,
      value: jest.fn(),
    });

    window.open = jest.fn(() => ({
      location: { href: "" },
      opener: null,
      close: jest.fn(),
    } as unknown as Window));
    URL.createObjectURL = jest.fn(() => "blob:test-file");
    URL.createObjectURL = jest.fn(() => "blob:test-file");
  });

  it("renders dashboard heading", async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce({
        json: async () => ({ count: 5 }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      });

    render(<Dashboard />);

    expect(
      await screen.findByText(/good/i)
    ).toBeInTheDocument();
  });

  it("loads username from localStorage", async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce({
        json: async () => ({ count: 0 }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      });

    render(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByText(/john/i)).toBeInTheDocument();
    });
  });

  it("loads document count", async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce({
        json: async () => ({
          count: 12,
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      });

    render(<Dashboard />);

    expect(
      await screen.findByText("12")
    ).toBeInTheDocument();
  });

  it("renders recent files", async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce({
        json: async () => ({
          count: 5,
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [
          "/tmp/file1.pdf",
          "/tmp/file2.docx",
        ],
      });

    render(<Dashboard />);

    expect(
      await screen.findByText("file1.pdf")
    ).toBeInTheDocument();

    expect(
      await screen.findByText("file2.docx")
    ).toBeInTheDocument();
  });

  it("shows empty state", async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce({
        json: async () => ({
          count: 0,
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      });

    render(<Dashboard />);

    expect(
      await screen.findByText(
        /no documents uploaded yet/i
      )
    ).toBeInTheDocument();
  });

  it("shows server error", async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce({
        json: async () => ({
          count: 0,
        }),
      })
      .mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

    render(<Dashboard />);

    expect(
      await screen.findByText(
        /server returned 500/i
      )
    ).toBeInTheDocument();
  });

  it("opens document on double click", async () => {
    const user = userEvent.setup();

    global.fetch = jest
      .fn()
      .mockResolvedValueOnce({
        json: async () => ({
          count: 1,
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [
          "/tmp/file1.pdf",
        ],
      })
      .mockResolvedValueOnce({
        ok: true,
        blob: async () => new Blob(["file"]),
      });

    render(<Dashboard />);

    const doc =
      await screen.findByText(
        "file1.pdf"
      );

    await user.dblClick(doc);

    expect(fetch).toHaveBeenLastCalledWith(
      "http://localhost:8000/upload/files/view/file1.pdf",
      { headers: {} }
    );
    expect(window.open).toHaveBeenCalledWith("about:blank", "_blank");
  });

  it("navigates to documents page", async () => {
    const user = userEvent.setup();

    global.fetch = jest
      .fn()
      .mockResolvedValueOnce({
        json: async () => ({
          count: 0,
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      });

    render(<Dashboard />);

    await user.click(
      screen.getByRole("button", {
        name: /view all/i,
      })
    );

    expect(mockPush).toHaveBeenCalledWith("/documents");
  });

  it("shows loading state", () => {
    global.fetch = jest.fn(
      () =>
        new Promise(() => {})
    );

    render(<Dashboard />);

    expect(
      screen.getByText(
        /loading documents/i
      )
    ).toBeInTheDocument();
  });
});