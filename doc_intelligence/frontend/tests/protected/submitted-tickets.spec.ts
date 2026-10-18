import { test, expect } from "../fixtures/authenticated";

test.describe("Submitted Tickets", () => {
  const ticket = {
    id: "1",
    username: "john",
    email: "john@test.com",
    subject: "login_issue",
    description: "Cannot login",
    priority: "high",
    status: "open",
    filepath: "/tmp/error.png",
  };

  test("renders page", async ({ page }) => {
    await page.route("**/contact/open_tickets", async (route) => {
      await route.fulfill({
        status: 200,
        body: JSON.stringify([]),
      });
    });

    await page.goto("/submitted_tickets");

    await expect(
      page.getByRole("heading", {
        name: /open tickets/i,
      })
    ).toBeVisible();
  });

  test("shows empty state", async ({ page }) => {
    await page.route("**/contact/open_tickets", async (route) => {
      await route.fulfill({
        status: 200,
        body: JSON.stringify([]),
      });
    });

    await page.goto("/submitted_tickets");

    await expect(
      page.getByText(/no open tickets/i)
    ).toBeVisible();
  });

  test("renders tickets", async ({ page }) => {
    await page.route("**/contact/open_tickets", async (route) => {
      await route.fulfill({
        status: 200,
        body: JSON.stringify([ticket]),
      });
    });

    await page.goto("/submitted_tickets");

    await expect(
      page.getByRole("cell", { name: "john", exact: true })
    ).toBeVisible();

    await expect(
      page.getByText("john@test.com")
    ).toBeVisible();

    await expect(
      page.getByText("Cannot login")
    ).toBeVisible();
  });

  test("updates status", async ({ page }) => {
    await page.route("**/contact/open_tickets", async (route) => {
      await route.fulfill({
        status: 200,
        body: JSON.stringify([ticket]),
      });
    });

    await page.route(
      "**/contact/update_status*",
      async (route) => {
        await route.fulfill({
          status: 200,
          body: "{}",
        });
      }
    );

    await page.goto("/submitted_tickets");

    const select = page.locator("select").first();

    await select.selectOption("completed");

    await expect(select).toHaveValue("completed");
  });

  test("shows server error", async ({ page }) => {
    await page.route("**/contact/open_tickets", async (route) => {
      await route.fulfill({
        status: 500,
        body: "{}",
      });
    });

    await page.goto("/submitted_tickets");

    await expect(
      page.locator("main p").filter({
        hasText: "Failed to load tickets: 500",
      })
    ).toBeVisible();
  });

  test("attachment button disabled when missing", async ({
    page,
  }) => {
    await page.route("**/contact/open_tickets", async (route) => {
      await route.fulfill({
        status: 200,
        body: JSON.stringify([
          {
            ...ticket,
            filepath: null,
          },
        ]),
      });
    });

    await page.goto("/submitted_tickets");

    await expect(
      page.getByRole("button", {
        name: /view/i,
      })
    ).toBeDisabled();
  });

  test("renders navigation links", async ({ page }) => {
    await page.route("**/contact/open_tickets", async (route) => {
      await route.fulfill({
        status: 200,
        body: JSON.stringify([]),
      });
    });

    await page.goto("/submitted_tickets");

    await expect(
      page.getByRole("link", {
        name: /back/i,
      })
    ).toHaveAttribute("href", "/ticket");

    await expect(
      page.getByRole("link", {
        name: /view all/i,
      })
    ).toHaveAttribute("href", "/view_all");
  });
});