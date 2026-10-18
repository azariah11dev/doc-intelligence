import { test, expect } from "@playwright/test";

test.describe("Demo Page", () => {
  test("renders heading", async ({ page }) => {
    await page.goto("/demo");

    await expect(
      page.getByRole("heading", {
        name: /intelli doc demo/i,
      })
    ).toBeVisible();
  });

  test("renders description", async ({ page }) => {
    await page.goto("/demo");

    await expect(
      page.getByText(
        /watch a quick walkthrough of the intelli_doc platform/i
      )
    ).toBeVisible();
  });

  test("renders youtube iframe", async ({ page }) => {
    await page.goto("/demo");

    const iframe = page.locator(
      'iframe[title="Intelli_Doc Demo Video"]'
    );

    await expect(iframe).toBeVisible();
  });

  test("youtube iframe uses expected source", async ({ page }) => {
    await page.goto("/demo");

    const iframe = page.locator(
      'iframe[title="Intelli_Doc Demo Video"]'
    );

    await expect(iframe).toHaveAttribute(
      "src",
      "https://www.youtube.com/embed/bQD9zk1SHrU"
    );
  });

  test("iframe supports fullscreen playback", async ({ page }) => {
    await page.goto("/demo");

    const iframe = page.locator(
      'iframe[title="Intelli_Doc Demo Video"]'
    );

    await expect(iframe).toHaveAttribute(
      "allow",
      /picture-in-picture/
    );

    await expect(iframe).toHaveAttribute(
      "allowfullscreen",
      ""
    );
  });
});