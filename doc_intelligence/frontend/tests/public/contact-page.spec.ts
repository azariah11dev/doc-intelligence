import { test, expect } from "@playwright/test";

test.describe("Contact Page", () => {
  test("renders page", async ({ page }) => {
    await page.goto("/contact");

    await expect(
      page.getByRole("heading", {
        name: /contact us/i,
      })
    ).toBeVisible();

    await expect(
      page.getByRole("heading", {
        name: /send a message/i,
      })
    ).toBeVisible();
  });

  test("allows user to fill form", async ({ page }) => {
    await page.goto("/contact");

    await page
      .getByPlaceholder("Your name")
      .fill("John Doe");

    await page
      .getByPlaceholder("you@example.com")
      .fill("john@test.com");

    await page
      .getByPlaceholder("How can we help?")
      .fill("Testing contact form");

    await expect(
      page.getByPlaceholder("Your name")
    ).toHaveValue("John Doe");

    await expect(
      page.getByPlaceholder("you@example.com")
    ).toHaveValue("john@test.com");
  });

  test("shows success message", async ({ page }) => {
    await page.route(
      "http://localhost:8000/contact/",
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

    await page.goto("/contact");

    await page.getByPlaceholder("Your name").fill("John");
    await page
      .getByPlaceholder("you@example.com")
      .fill("john@test.com");

    await page
      .getByPlaceholder("How can we help?")
      .fill("Hello");

    await page
      .getByRole("button", {
        name: /send message/i,
      })
      .click();

    await expect(
      page.getByText(/message sent successfully/i)
    ).toBeVisible();
  });

  test("shows error message", async ({ page }) => {
    await page.route(
      "http://localhost:8000/contact/",
      async (route) => {
        await route.fulfill({
          status: 500,
          contentType: "application/json",
          body: JSON.stringify({
            error: true,
          }),
        });
      }
    );

    await page.goto("/contact");

    await page.getByPlaceholder("Your name").fill("John");
    await page
      .getByPlaceholder("you@example.com")
      .fill("john@test.com");

    await page
      .getByPlaceholder("How can we help?")
      .fill("Hello");

    await page
      .getByRole("button", {
        name: /send message/i,
      })
      .click();

    await expect(
      page.getByText(/something went wrong/i)
    ).toBeVisible();
  });

  test("shows loading state while submitting", async ({ page }) => {
    await page.route(
      "http://localhost:8000/contact/",
      async (route) => {
        await new Promise((r) => setTimeout(r, 1000));

        await route.fulfill({
          status: 200,
          body: "{}",
        });
      }
    );

    await page.goto("/contact");

    await page.getByPlaceholder("Your name").fill("John");
    await page
      .getByPlaceholder("you@example.com")
      .fill("john@test.com");

    await page
      .getByPlaceholder("How can we help?")
      .fill("Hello");

    await page
      .getByRole("button", {
        name: /send message/i,
      })
      .click();

    await expect(
      page.getByRole("button", {
        name: /sending/i,
      })
    ).toBeDisabled();
  });
});