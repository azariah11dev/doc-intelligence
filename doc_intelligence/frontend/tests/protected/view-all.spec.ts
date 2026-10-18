import { test, expect } from "../fixtures/authenticated";

test.describe("View All Tickets", () => {
  const ticket = {
    id: "1",
    username: "john",
    email: "john@test.com",
    subject: "login_issue",
    description: "Cannot login",
    priority: "high",
    status: "completed",
    filepath: "/tmp/error.png",
  };

  test("renders page", async ({ page }) => {
    await page.route(
      "**/contact/all_tickets",
      async (route) => {
        await route.fulfill({
          status: 200,
          body: JSON.stringify([]),
        });
      }
    );

    await page.goto("/view_all");

    await expect(
      page.getByRole("heading", {
        name: /all tickets/i,
      })
    ).toBeVisible();
  });

  test("shows empty state", async ({ page }) => {
    await page.route(
      "**/contact/all_tickets",
      async (route) => {
        await route.fulfill({
          status: 200,
          body: JSON.stringify([]),
        });
      }
    );

    await page.goto("/view_all");

    await expect(
      page.getByText(/no tickets yet/i)
    ).toBeVisible();
  });

  test("renders tickets", async ({ page }) => {
    await page.route(
      "**/contact/all_tickets",
      async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify([ticket]),
        });
      }
    );

    await page.goto("/view_all");

    await expect(
      page.getByRole("cell", { name: "john", exact: true })
    ).toBeVisible();

    await expect(
      page.getByText("john@test.com")
    ).toBeVisible();

    await expect(
      page.getByText("Cannot login")
    ).toBeVisible();

    await expect(
      page.getByText("completed")
    ).toBeVisible();
  });

  test("shows loading state", async ({ page }) => {
    await page.route(
      "**/contact/all_tickets",
      async (route) => {
        await new Promise((resolve) =>
          setTimeout(resolve, 1000)
        );

        await route.fulfill({
          status: 200,
          body: JSON.stringify([]),
        });
      }
    );

    await page.goto("/view_all");

    await expect(
      page.getByText(/loading tickets/i)
    ).toBeVisible();
  });

  test("shows error state", async ({ page }) => {
    await page.route(
      "**/contact/all_tickets",
      async (route) => {
        await route.fulfill({
          status: 500,
          body: "{}",
        });
      }
    );

    await page.goto("/view_all");

    await expect(
      page.locator("main p").filter({
        hasText: "Failed to load tickets: 500",
      })
    ).toBeVisible();
  });

  test("attachment button disabled when file missing", async ({
    page,
  }) => {
    await page.route(
      "**/contact/all_tickets",
      async (route) => {
        await route.fulfill({
          status: 200,
          body: JSON.stringify([
            {
              ...ticket,
              filepath: null,
            },
          ]),
        });
      }
    );

    await page.goto("/view_all");

    await expect(
      page.getByRole("button", {
        name: /view/i,
      })
    ).toBeDisabled();
  });

  test("renders back navigation link", async ({
    page,
  }) => {
    await page.route(
      "**/contact/all_tickets",
      async (route) => {
        await route.fulfill({
          status: 200,
          body: JSON.stringify([]),
        });
      }
    );

    await page.goto("/view_all");

    await expect(
      page.getByRole("link", {
        name: /back/i,
      })
    ).toHaveAttribute(
      "href",
      "/submitted_tickets"
    );
  });
});