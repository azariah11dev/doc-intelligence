import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Documents from "@/app/documents/page";

describe("Documents", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    Storage.prototype.getItem = jest.fn((key) => {
      if (key === "username") return "john";
      if (key === "role") return "Admin";
      if (key === "access_token") return "token";
      return null;
    });

    Object.defineProperty(window, "alert", {
      writable: true,
      value: jest.fn(),
    });

    window.open = jest.fn();
  });

  function mockInitialLoad() {
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          files: [
            "/tmp/test.pdf",
            "/tmp/test.docx",
          ],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [
          {
            id: 1,
            upload_filename: "test.pdf",
            saved_filename: "test.pdf",
            file_type: "pdf",
            file_size: 1024,
            action: "UPLOAD",
            upload_ts: "2025-01-01",
            status: "SUCCESS",
            error: null,
          },
        ],
      });
  }

  it("renders page sections", async () => {
    mockInitialLoad();

    render(<Documents />);

    expect(
      await screen.findByText(/upload document/i)
    ).toBeInTheDocument();

    expect(
      screen.getByText(/find documents/i)
    ).toBeInTheDocument();

    expect(
      screen.getByText(/audit log/i)
    ).toBeInTheDocument();
  });

  it("loads documents", async () => {
    mockInitialLoad();

    render(<Documents />);

    expect(
      await screen.findByText("test.pdf")
    ).toBeInTheDocument();

    expect(
      await screen.findByText("test.docx")
    ).toBeInTheDocument();
  });

  it("loads audit rows", async () => {
    mockInitialLoad();

    render(<Documents />);

    expect(
      await screen.findByText("UPLOAD")
    ).toBeInTheDocument();

    expect(
      await screen.findByText("SUCCESS")
    ).toBeInTheDocument();
  });

  it("filters documents", async () => {
    const user = userEvent.setup();

    mockInitialLoad();

    render(<Documents />);

    await screen.findByText("test.pdf");

    await user.type(
      screen.getByPlaceholderText(
        /search by file name/i
      ),
      "pdf"
    );

    expect(
      screen.getByText("test.pdf")
    ).toBeInTheDocument();

    expect(
      screen.queryByText("test.docx")
    ).not.toBeInTheDocument();
  });

  it("shows upload validation message", async () => {
    mockInitialLoad();

    render(<Documents />);

    const user = userEvent.setup();

    await user.click(
      screen.getByRole("button", {
        name: /upload/i,
      })
    );

    expect(
      screen.getByText(/select a file first/i)
    ).toBeInTheDocument();
  });

  it("opens document on double click", async () => {
    const user = userEvent.setup();

    mockInitialLoad();

    render(<Documents />);

    const file = await screen.findByText(
      "test.pdf"
    );

    await user.dblClick(file);

    expect(window.open).toHaveBeenCalledWith(
      "http://localhost:8000/upload/files/view/test.pdf",
      "_blank",
      "noopener,noreferrer"
    );
  });

  it("opens delete confirmation", async () => {
    const user = userEvent.setup();

    mockInitialLoad();

    render(<Documents />);

    const deleteButton =
      await screen.findByRole("button", {
        name: /delete/i,
      });

    await user.click(deleteButton);

    expect(
      screen.getByText(/delete document/i)
    ).toBeInTheDocument();
  });

  it("requires deletion reason", async () => {
    const user = userEvent.setup();

    mockInitialLoad();

    render(<Documents />);

    const deleteButton =
      await screen.findByRole("button", {
        name: /^delete$/i,
      });

    await user.click(deleteButton);

    const modalDelete =
      screen.getAllByRole("button", {
        name: /^delete$/i,
      })[1];

    await user.click(modalDelete);

    expect(window.alert).toHaveBeenCalled();
  });

  it("shows file error response", async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 500,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      });

    render(<Documents />);

    expect(
      await screen.findByText(
        /server returned 500/i
      )
    ).toBeInTheDocument();
  });

  it("shows audit empty state", async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          files: [],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      });

    render(<Documents />);

    expect(
      await screen.findByText(
        /no audit entries yet/i
      )
    ).toBeInTheDocument();
  });
});