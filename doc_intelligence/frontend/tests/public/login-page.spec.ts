import { test, expect } from "@playwright/test";

test.describe("Login Page", () => {
  test("renders login form", async ({ page }) => {
    await page.goto("/login");

    await expect(
      page.getByRole("heading", {
        name: /login/i,
      })
    ).toBeVisible();

    await expect(
      page.getByPlaceholder("Enter username")
    ).toBeVisible();

    await expect(
      page.getByPlaceholder("Enter password")
    ).toBeVisible();
  });

  test("allows typing into fields", async ({ page }) => {
    await page.goto("/login");

    await page
      .getByPlaceholder("Enter username")
      .fill("testuser");

    await page
      .getByPlaceholder("Enter password")
      .fill("password123");

    await expect(
      page.getByPlaceholder("Enter username")
    ).toHaveValue("testuser");

    await expect(
      page.getByPlaceholder("Enter password")
    ).toHaveValue("password123");
  });

  test("contains signup link", async ({ page }) => {
    await page.goto("/login");

    await expect(
      page.getByRole("link", {
        name: /sign up/i,
      })
    ).toHaveAttribute("href", "/signup");
  });

  test("successful login", async ({ page }) => {
    await page.route(
      "http://localhost:8000/auth/login",
      async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            access_token: "token123",
            username: "testuser",
            role: "user",
            email: "test@test.com",
          }),
        });
      }
    );

    await page.goto("/login");

    await page
      .getByPlaceholder("Enter username")
      .fill("testuser");

    await page
      .getByPlaceholder("Enter password")
      .fill("password123");

    await page.getByRole("button", {
      name: /sign in/i,
    }).click();

    await expect(page).toHaveURL(/dashboard/);
  });

  test("shows login error", async ({ page }) => {
    page.on("dialog", async (dialog) => {
      expect(dialog.message()).toContain(
        "Invalid username or password"
      );
      await dialog.dismiss();
    });

    await page.route(
      "http://localhost:8000/auth/login",
      async (route) => {
        await route.fulfill({
          status: 401,
          contentType: "application/json",
          body: JSON.stringify({
            detail: "Invalid username or password",
          }),
        });
      }
    );

    await page.goto("/login");

    await page
      .getByPlaceholder("Enter username")
      .fill("baduser");

    await page
      .getByPlaceholder("Enter password")
      .fill("badpass");

    await page.getByRole("button", {
      name: /sign in/i,
    }).click();
  });

  test("stores token in localStorage", async ({ page }) => {
    await page.route(
      "http://localhost:8000/auth/login",
      async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            access_token: "token123",
            username: "testuser",
            role: "user",
            email: "test@test.com",
          }),
        });
      }
    );

    await page.goto("/login");

    await page
      .getByPlaceholder("Enter username")
      .fill("testuser");

    await page
      .getByPlaceholder("Enter password")
      .fill("password123");

    await page.getByRole("button", {
      name: /sign in/i,
    }).click();

    await expect
      .poll(() =>
        page.evaluate(() =>
          localStorage.getItem("access_token")
        )
      )
      .toBe("token123");
  });
});