import { test, expect } from "../fixtures/authenticated";

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
      page.getByText("5", { exact: true })
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
      page.getByText("test1.pdf", { exact: true })
    ).toBeVisible();

    await expect(
      page.getByText("test2.docx", { exact: true })
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
          body: JSON.stringify(["test.pdf"]),
        });
      }
    );
    let fileRequestAuthorization: string | undefined;
    await page.context().route(
      "http://localhost:8000/upload/files/view/test.pdf",
      async (route) => {
        const corsHeaders = {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Headers": "Authorization",
          "Access-Control-Allow-Methods": "GET, OPTIONS",
        };
        if (route.request().method() === "OPTIONS") {
          await route.fulfill({ status: 204, headers: corsHeaders });
          return;
        }
        fileRequestAuthorization = route.request().headers().authorization;
        await route.fulfill({
          status: 200,
          contentType: "application/pdf",
          headers: corsHeaders,
          body: "mock document",
        });
      }
    );

    const popupPromise =
      page.waitForEvent("popup");

    await page.goto("/dashboard");

    await page
      .getByText("test.pdf", { exact: true })
      .dblclick();

    const popup = await popupPromise;

    await expect
      .poll(() => fileRequestAuthorization)
      .toBe("Bearer playwright-test-token");
    expect(popup).toBeDefined();
  });
});