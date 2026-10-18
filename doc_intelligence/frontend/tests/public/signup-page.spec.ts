import { test, expect } from "@playwright/test";

test.describe("Signup Page", () => {
  test("renders signup form", async ({ page }) => {
    await page.goto("/signup");

    await expect(
      page.getByRole("heading", {
        name: /create account/i,
      })
    ).toBeVisible();

    await expect(
      page.getByPlaceholder("Enter username")
    ).toBeVisible();

    await expect(
      page.getByPlaceholder("you@example.com")
    ).toBeVisible();
  });

  test("allows typing into form fields", async ({ page }) => {
    await page.goto("/signup");

    await page
      .getByPlaceholder("Enter username")
      .fill("john");

    await page
      .getByPlaceholder("you@example.com")
      .fill("john@test.com");

    await page
      .getByPlaceholder("Create a password")
      .fill("password123");

    await page
      .getByPlaceholder("Re-enter password")
      .fill("password123");

    await expect(
      page.getByPlaceholder("Enter username")
    ).toHaveValue("john");
  });

  test("shows password mismatch error", async ({ page }) => {
    page.on("dialog", async (dialog) => {
      expect(dialog.message()).toBe(
        "Passwords do not match"
      );
      await dialog.dismiss();
    });

    await page.goto("/signup");

    await page
      .getByPlaceholder("Enter username")
      .fill("john");

    await page
      .getByPlaceholder("you@example.com")
      .fill("john@test.com");

    await page
      .getByPlaceholder("Create a password")
      .fill("password123");

    await page
      .getByPlaceholder("Re-enter password")
      .fill("different123");

    await page.getByRole("button", {
      name: /sign up/i,
    }).click();
  });

  test("registers successfully", async ({ page }) => {
    page.on("dialog", async (dialog) => {
      expect(dialog.message()).toContain(
        "Registration successful"
      );
      await dialog.accept();
    });

    await page.route(
      "http://localhost:8000/auth/register",
      async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            success: true,
          }),
        });
      }
    );

    await page.goto("/signup");

    await page
      .getByPlaceholder("Enter username")
      .fill("john");

    await page
      .getByPlaceholder("you@example.com")
      .fill("john@test.com");

    await page
      .getByPlaceholder("Create a password")
      .fill("password123");

    await page
      .getByPlaceholder("Re-enter password")
      .fill("password123");

    await page.getByRole("button", {
      name: /sign up/i,
    }).click();

    await expect(page).toHaveURL(/login/);
  });

  test("shows registration failed error", async ({ page }) => {
    page.on("dialog", async (dialog) => {
      expect(dialog.message()).toBe(
        "Username already exists"
      );
      await dialog.dismiss();
    });

    await page.route(
      "http://localhost:8000/auth/register",
      async (route) => {
        await route.fulfill({
          status: 400,
          contentType: "application/json",
          body: JSON.stringify({
            detail: "Username already exists",
          }),
        });
      }
    );

    await page.goto("/signup");

    await page
      .getByPlaceholder("Enter username")
      .fill("john");

    await page
      .getByPlaceholder("you@example.com")
      .fill("john@test.com");

    await page
      .getByPlaceholder("Create a password")
      .fill("password123");

    await page
      .getByPlaceholder("Re-enter password")
      .fill("password123");

    await page.getByRole("button", {
      name: /sign up/i,
    }).click();
  });

  test("contains login link", async ({ page }) => {
    await page.goto("/signup");

    await expect(
      page.getByRole("link", {
        name: /log in/i,
      })
    ).toHaveAttribute("href", "/login");
  });
});