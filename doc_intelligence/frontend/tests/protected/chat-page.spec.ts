import { test, expect } from "../fixtures/authenticated";

test.describe("Chat Page", () => {
  test("renders chat ui", async ({ page }) => {
    await page.goto("/chat");

    await expect(
      page.getByPlaceholder(
        "Chat with your documents"
      )
    ).toBeVisible();

    await expect(
      page.getByRole("button", {
        name: "Send",
      })
    ).toBeVisible();
  });

  test("allows entering a question", async ({
    page,
  }) => {
    await page.goto("/chat");

    const textarea = page.getByPlaceholder(
      "Chat with your documents"
    );

    await textarea.fill("What is AI?");

    await expect(textarea).toHaveValue(
      "What is AI?"
    );
  });

  test("toggles accuracy mode", async ({
    page,
  }) => {
    await page.goto("/chat");

    const accuracy = page.getByRole("button", {
      name: /accuracy on/i,
    });

    await accuracy.click();

    await expect(
      page.getByRole("button", {
        name: /accuracy off/i,
      })
    ).toBeVisible();
  });

  test("changes model selection", async ({
    page,
  }) => {
    await page.goto("/chat");

    const select =
      page.getByLabel("Choose a model:");

    await select.selectOption({
      index: 1,
    });

    await expect(select).not.toHaveValue(
      "qwen3.8:27b"
    );
  });

  test("new chat clears conversation", async ({
    page,
  }) => {
    await page.goto("/chat");

    await page.evaluate(() => {
      localStorage.setItem(
        "conversation_id",
        "abc"
      );
    });

    await page.getByRole("button", {
      name: /new chat/i,
    }).click();

    const result = await page.evaluate(() =>
      localStorage.getItem("conversation_id")
    );

    expect(result).toBeNull();
  });

  test("shows unsupported provider alert", async ({
    page,
  }) => {
    page.once("dialog", async (dialog) => {
      expect(dialog.message()).toContain(
        "not currently connected"
      );
      await dialog.dismiss();
    });

    await page.goto("/chat");

    await page
      .getByLabel("Choose a model:")
      .selectOption({ label: "Claude-3.5-Sonnet" });

    await page
      .getByPlaceholder(
        "Chat with your documents"
      )
      .fill("hello");

    await page.getByRole("button", {
      name: /send/i,
    }).click();
  });

  test("streams chat response", async ({
    page,
  }) => {
    await page.route(
      "http://localhost:8000/response_generation/answer",
      async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "text/plain",
          body: "Hello from AI",
        });
      }
    );

    await page.goto("/chat");

    await page
      .getByPlaceholder(
        "Chat with your documents"
      )
      .fill("hello");

    await page.getByRole("button", {
      name: /send/i,
    }).click();

    await expect(
      page.getByText("Hello from AI")
    ).toBeVisible();
  });
});