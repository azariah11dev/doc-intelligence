import { test, expect } from "@playwright/test";

test.describe("Dashboard", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem(
        "username",
        "john"
      );
    });
  });

  test("renders overview", async ({ page }) => {
    await page.route(
      "**/upload/files",
      async (route) => {
        await route.fulfill({
          status: 200,
          body: JSON.stringify({
            count: 5,
          }),
        });
      }
    );

    await page.route(
      "**/upload/recent_files",
      async (route) => {
        await route.fulfill({
          status: 200,
          body: JSON.stringify([]),
        });
      }
    );

    await page.goto("/dashboard");

    await expect(
      page.getByText(/overview/i)
    ).toBeVisible();

    await expect(
      page.getByText("5")
    ).toBeVisible();
  });

  test("renders recent documents", async ({
    page,
  }) => {
    await page.route("**/upload/files", async (route) => {
      await route.fulfill({
        status: 200,
        body: JSON.stringify({ count: 2 }),
      });
    });

    await page.route(
      "**/upload/recent_files",
      async (route) => {
        await route.fulfill({
          status: 200,
          body: JSON.stringify([
            "/tmp/test1.pdf",
            "/tmp/test2.docx",
          ]),
        });
      }
    );

    await page.goto("/dashboard");

    await expect(
      page.getByText("test1.pdf")
    ).toBeVisible();

    await expect(
      page.getByText("test2.docx")
    ).toBeVisible();
  });

  test("shows empty document state", async ({
    page,
  }) => {
    await page.route("**/upload/files", async (route) => {
      await route.fulfill({
        status: 200,
        body: JSON.stringify({ count: 0 }),
      });
    });

    await page.route(
      "**/upload/recent_files",
      async (route) => {
        await route.fulfill({
          status: 200,
          body: JSON.stringify([]),
        });
      }
    );

    await page.goto("/dashboard");

    await expect(
      page.getByText(
        /no documents uploaded yet/i
      )
    ).toBeVisible();
  });

  test("shows recent file error", async ({
    page,
  }) => {
    await page.route("**/upload/files", async (route) => {
      await route.fulfill({
        status: 200,
        body: JSON.stringify({ count: 0 }),
      });
    });

    await page.route(
      "**/upload/recent_files",
      async (route) => {
        await route.fulfill({
          status: 500,
          body: "error",
        });
      }
    );

    await page.goto("/dashboard");

    await expect(
      page.getByText(
        /server returned 500/i
      )
    ).toBeVisible();
  });

  test("view all button navigates", async ({
    page,
  }) => {
    await page.goto("/dashboard");

    await page.getByRole("button", {
      name: /view all/i,
    }).click();

    await expect(page).toHaveURL(
      /\/documents$/
    );
  });

  test("double clicking document opens file", async ({
    page,
  }) => {
    await page.route("**/upload/files", async (route) => {
      await route.fulfill({
        status: 200,
        body: JSON.stringify({ count: 1 }),
      });
    });

    await page.route(
      "**/upload/recent_files",
      async (route) => {
        await route.fulfill({
          status: 200,
          body: JSON.stringify([
            "/tmp/test.pdf",
          ]),
        });
      }
    );

    const popupPromise =
      page.waitForEvent("popup");

    await page.goto("/dashboard");

    await page
      .getByText("test.pdf")
      .dblclick();

    const popup = await popupPromise;

    expect(popup.url()).toContain(
      "/upload/files/view/test.pdf"
    );
  });
});