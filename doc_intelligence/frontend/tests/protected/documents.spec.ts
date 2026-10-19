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
              {
                id: "report-document-id",
                path: "report.pdf",
                name: "report.pdf",
              },
              {
                id: "notes-document-id",
                path: "notes.docx",
                name: "notes.docx",
              },
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
      page.getByRole("heading", { name: /upload document/i })
    ).toBeVisible();

    await expect(
      page.getByRole("heading", { name: /find documents/i })
    ).toBeVisible();

    await expect(
      page.getByRole("heading", { name: /audit log/i })
    ).toBeVisible();
  });

  test("renders files", async ({ page }) => {
    await page.goto("/documents");

    await expect(
      page.locator("ul").getByText("report.pdf", { exact: true })
    ).toBeVisible();

    await expect(
      page.locator("ul").getByText("notes.docx", { exact: true })
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
      page.locator("ul").getByText("report.pdf", { exact: true })
    ).toBeVisible();

    await expect(
      page.locator("ul").getByText("notes.docx", { exact: true })
    ).toHaveCount(0);
  });

  test("renders audit log", async ({ page }) => {
    await page.goto("/documents");

    await expect(
      page.getByRole("cell", { name: "UPLOAD", exact: true })
    ).toBeVisible();

    await expect(
      page.getByRole("cell", { name: "SUCCESS", exact: true })
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