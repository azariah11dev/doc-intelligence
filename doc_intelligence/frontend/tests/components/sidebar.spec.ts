import { test, expect } from "../fixtures/authenticated";

test.describe("Sidebar", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem("username", "john");
      localStorage.setItem("role", "Admin");
    });
  });

  test("renders username and role", async ({
    page,
  }) => {
    await page.goto("/dashboard");

    await expect(
      page.getByText(/john \(admin\)/i)
    ).toBeVisible();
  });

  test("renders navigation links", async ({
    page,
  }) => {
    await page.goto("/dashboard");

    await expect(
      page.getByRole("link", {
        name: /dashboard/i,
      })
    ).toHaveAttribute(
      "href",
      "/dashboard"
    );

    await expect(
      page.getByRole("link", {
        name: /documents/i,
      })
    ).toHaveAttribute(
      "href",
      "/documents"
    );

    await expect(
      page.getByRole("link", {
        name: /chat history/i,
      })
    ).toHaveAttribute(
      "href",
      "/chat_history"
    );
  });

  test("shows user roles link for admin", async ({
    page,
  }) => {
    await page.goto("/dashboard");

    await expect(
      page.getByRole("link", {
        name: /user roles/i,
      })
    ).toBeVisible();
  });

  test("hides user roles link for normal user", async ({
    page,
  }) => {
    await page.addInitScript(() => {
      localStorage.setItem("username", "john");
      localStorage.setItem("role", "User");
    });

    await page.goto("/dashboard");

    await expect(
      page.getByRole("link", {
        name: /user roles/i,
      })
    ).toHaveCount(0);
  });

  test("navigates to chat history", async ({
    page,
  }) => {
    await page.goto("/dashboard");

    await page.getByRole("link", {
      name: /chat history/i,
    }).click();

    await expect(page).toHaveURL(
      /\/chat_history$/
    );
  });

  test("navigates to documents", async ({
    page,
  }) => {
    await page.goto("/dashboard");

    await page.getByRole("link", {
      name: /^documents$/i,
    }).click();

    await expect(page).toHaveURL(
      /\/documents$/
    );
  });

  test("logout clears local storage", async ({
    page,
  }) => {
    await page.goto("/dashboard");

    await page.getByRole("link", {
      name: /logout/i,
    }).click();

    await expect(page).toHaveURL(
      /\/login$/
    );
    await expect
      .poll(() =>
        page.evaluate(() => localStorage.getItem("access_token"))
      )
      .toBeNull();
  });

  test("renders date and time", async ({
    page,
  }) => {
    await page.goto("/dashboard");

    await expect(
      page.locator("text=•")
    ).toBeVisible();
  });
});