import { test, expect } from "@playwright/test";

test.describe("Chat History", () => {
  test("renders heading", async ({
    page,
  }) => {
    await page.route(
      "http://localhost:8000/chat/conversations",
      async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify([]),
        });
      }
    );

    await page.goto("/chat_history");

    await expect(
      page.getByRole("heading", {
        name: /chat history/i,
      })
    ).toBeVisible();
  });

  test("shows empty state", async ({
    page,
  }) => {
    await page.route(
      "http://localhost:8000/chat/conversations",
      async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify([]),
        });
      }
    );

    await page.goto("/chat_history");

    await expect(
      page.getByText(/no conversations yet/i)
    ).toBeVisible();
  });

  test("renders conversations returned by api", async ({
    page,
  }) => {
    await page.route(
      "http://localhost:8000/chat/conversations",
      async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify([
            {
              id: "123",
              username: "john",
              created_at:
                "2025-01-01T00:00:00Z",
              last_updated:
                "2025-01-02T00:00:00Z",
            },
          ]),
        });
      }
    );

    await page.goto("/chat_history");

    await expect(
      page.getByText(
        /conversation with john/i
      )
    ).toBeVisible();
  });

  test("stores conversation id and navigates to chat", async ({
    page,
  }) => {
    await page.route(
      "http://localhost:8000/chat/conversations",
      async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify([
            {
              id: "abc123",
              username: "john",
              created_at:
                "2025-01-01T00:00:00Z",
              last_updated:
                "2025-01-01T00:00:00Z",
            },
          ]),
        });
      }
    );

    await page.goto("/chat_history");

    await page
      .getByText(/conversation with john/i)
      .click();

    await expect(page).toHaveURL(
      /\/chat$/
    );

    const storedId = await page.evaluate(() =>
      localStorage.getItem(
        "open_conversation_id"
      )
    );

    expect(storedId).toBe("abc123");
  });

  test("renders loading state before api resolves", async ({
    page,
  }) => {
    await page.route(
      "http://localhost:8000/chat/conversations",
      async (route) => {
        await new Promise((r) =>
          setTimeout(r, 1000)
        );

        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify([]),
        });
      }
    );

    await page.goto("/chat_history");

    await expect(
      page.getByText(/loading/i)
    ).toBeVisible();
  });
});