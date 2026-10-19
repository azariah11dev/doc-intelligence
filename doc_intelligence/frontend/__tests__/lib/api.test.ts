import { apiFetch, apiUrl, openProtectedFile } from "@/lib/api";

describe("API helpers", () => {
  beforeEach(() => {
    localStorage.clear();
    jest.restoreAllMocks();
  });

  it("uses the configured API base URL", () => {
    expect(apiUrl("/chat/conversations")).toBe(
      "http://localhost:8000/chat/conversations"
    );
  });

  it("attaches the bearer token to API requests", async () => {
    localStorage.setItem("access_token", "test-access-token");
    global.fetch = jest.fn().mockResolvedValue({ status: 200 });

    await apiFetch("/chat/conversations");

    const [, init] = (global.fetch as jest.Mock).mock.calls[0];
    expect(new Headers(init.headers).get("Authorization")).toMatch(/^Bearer /);
  });

  it("clears local storage on unauthorized responses", async () => {
    localStorage.setItem("access_token", "expired-token");
    window.history.pushState({}, "", "/login");
    global.fetch = jest.fn().mockResolvedValue({ status: 401 });

    await apiFetch("/chat/conversations");

    expect(localStorage.length).toBe(0);
    window.history.pushState({}, "", "/");
  });

  it("opens protected file content from an authenticated blob response", async () => {
    localStorage.setItem("access_token", "test-access-token");
    const openedWindow = {
      location: { href: "" },
      opener: {},
      close: jest.fn(),
    };
    window.open = jest.fn(() => openedWindow as unknown as Window);
    URL.createObjectURL = jest.fn(() => "blob:protected-file");
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      blob: async () => new Blob(["protected content"]),
    });

    await openProtectedFile("/upload/files/view/example.pdf");

    const [, init] = (global.fetch as jest.Mock).mock.calls[0];
    expect(new Headers(init.headers).get("Authorization")).toMatch(/^Bearer /);
    expect(openedWindow.location.href).toBe("blob:protected-file");
  });
});
