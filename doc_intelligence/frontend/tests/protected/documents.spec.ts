import { test, expect } from "@playwright/test";

test.describe("Documents Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem("username", "john");
      localStorage.setItem("role", "Admin");
      localStorage.setItem("access_token", "token");
    });

    await page.route(
      "**/upload/files",
      async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            files: [
              "/docs/report.pdf",
              "/docs/notes.docx",
            ],
          }),
        });
      }
    );

    await page.route(
      "**/upload/audit_trail",
      async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify([
            {
              id: 1,
              upload_filename: "report.pdf",
              saved_filename: "report.pdf",
              file_type: "pdf",
              file_size: 1024,
              action: "UPLOAD",
              upload_ts: "2025-01-01",
              status: "SUCCESS",
              error: null,
            },
          ]),
        });
      }
    );
  });

  test("loads page", async ({ page }) => {
    await page.goto("/documents");

    await expect(
      page.getByText(/upload document/i)
    ).toBeVisible();

    await expect(
      page.getByText(/find documents/i)
    ).toBeVisible();

    await expect(
      page.getByText(/audit log/i)
    ).toBeVisible();
  });

  test("renders files", async ({ page }) => {
    await page.goto("/documents");

    await expect(
      page.getByText("report.pdf")
    ).toBeVisible();

    await expect(
      page.getByText("notes.docx")
    ).toBeVisible();
  });

  test("filters documents", async ({ page }) => {
    await page.goto("/documents");

    await page
      .getByPlaceholder(
        "Search by file name..."
      )
      .fill("report");

    await expect(
      page.getByText("report.pdf")
    ).toBeVisible();

    await expect(
      page.getByText("notes.docx")
    ).toHaveCount(0);
  });

  test("renders audit log", async ({ page }) => {
    await page.goto("/documents");

    await expect(
      page.getByText("UPLOAD")
    ).toBeVisible();

    await expect(
      page.getByText("SUCCESS")
    ).toBeVisible();
  });

  test("opens delete modal", async ({ page }) => {
    await page.goto("/documents");

    await page
      .getByRole("button", {
        name: /^delete$/i,
      })
      .first()
      .click();

    await expect(
      page.getByText(/delete document/i)
    ).toBeVisible();
  });

  test("validates deletion reason", async ({
    page,
  }) => {
    page.once("dialog", async (dialog) => {
      expect(dialog.message()).toContain(
        "without a reason"
      );

      await dialog.dismiss();
    });

    await page.goto("/documents");

    await page
      .getByRole("button", {
        name: /^delete$/i,
      })
      .first()
      .click();

    await page
      .getByRole("button", {
        name: /^delete$/i,
      })
      .last()
      .click();
  });

  test("shows upload validation", async ({
    page,
  }) => {
    await page.goto("/documents");

    await page
      .getByRole("button", {
        name: /^upload$/i,
      })
      .click();

    await expect(
      page.getByText(
        /select a file first/i
      )
    ).toBeVisible();
  });

  test("shows empty state", async ({ page }) => {
    await page.route(
      "**/upload/files",
      async (route) => {
        await route.fulfill({
          status: 200,
          body: JSON.stringify({
            files: [],
          }),
        });
      }
    );

    await page.goto("/documents");

    await expect(
      page.getByText(
        /no documents uploaded yet/i
      )
    ).toBeVisible();
  });
});