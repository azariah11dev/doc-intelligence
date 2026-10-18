import { test, expect } from "@playwright/test";

test.describe("About Page", () => {
  test("renders hero section", async ({ page }) => {
    await page.goto("/about");

    await expect(
      page.getByRole("heading", {
        name: /about doc intelligence/i,
      })
    ).toBeVisible();

    await expect(
      page.getByText(
        /doc intelligence transforms your documents into clear, verified answers/i
      )
    ).toBeVisible();
  });

  test("renders mission section", async ({ page }) => {
    await page.goto("/about");

    await expect(
      page.getByRole("heading", {
        name: /our mission/i,
      })
    ).toBeVisible();

    await expect(
      page.getByText(/information is locked inside documents/i)
    ).toBeVisible();
  });

  test("renders why we built this section", async ({ page }) => {
    await page.goto("/about");

    await expect(
      page.getByRole("heading", {
        name: /why we built this/i,
      })
    ).toBeVisible();

    await expect(
      page.getByText(
        /modern ai tools are powerful, but they often struggle with accuracy/i
      )
    ).toBeVisible();
  });

  test("renders differentiators list", async ({ page }) => {
    await page.goto("/about");

    const features = [
      "Verified citations",
      "Semantic retrieval",
      "Fast document processing",
      "Clear, concise answers",
      "Privacy-focused architecture",
    ];

    for (const feature of features) {
      await expect(
        page.getByText(feature, { exact: true })
      ).toBeVisible();
    }
  });

  test("shows all section headings", async ({ page }) => {
    await page.goto("/about");

    await expect(
      page.getByRole("heading", {
        name: /our mission/i,
      })
    ).toBeVisible();

    await expect(
      page.getByRole("heading", {
        name: /why we built this/i,
      })
    ).toBeVisible();

    await expect(
      page.getByRole("heading", {
        name: /what makes doc intelligence different/i,
      })
    ).toBeVisible();
  });

  test("renders footer", async ({ page }) => {
    await page.goto("/about");

    const currentYear = new Date().getFullYear();

    await expect(
      page.getByText(`© ${currentYear} Doc Intelligence`)
    ).toBeVisible();
  });
});