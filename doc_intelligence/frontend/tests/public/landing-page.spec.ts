import { test, expect } from "@playwright/test";

test.describe("Landing Page", () => {
    test("loads successfully", async ({ page }) => {
        await page.goto("/");

        await expect(page).toHaveTitle(/.*/);
    });

    test("displays hero content", async ({ page }) => {
        await page.goto("/");

        await expect(
            page.getByRole("heading", {
                name: /turn documents into verified answers/i,
            })
        ).toBeVisible();

        await expect(
            page.getByText(
                /upload any document\. ask a question\. get a citation-verified answer/i
            )
        ).toBeVisible();
    });

    test("shows 6 pipeline cards", async ({ page }) => {
        await page.goto("/");

        await expect(
            page.getByRole("heading", {
                name: /how it works/i,
            })
        ).toBeVisible();

        await expect(page.getByText("1. Upload Document")).toBeVisible();
        await expect(page.getByText("6. Verify Citation")).toBeVisible();
    });

    test("contains navigation links", async ({ page }) => {
        await page.goto("/");

        await expect(
            page.getByRole("link", { name: /try a demo/i })
        ).toHaveAttribute("href", "/demo");

        await expect(
            page.getByRole("link", { name: /make an account/i })
        ).toHaveAttribute("href", "/signup");
    });

    test("demo link points to demo page", async ({ page }) => {
        await page.goto("/");

        await expect(
            page.getByRole("link", { name: /try a demo/i })
        ).toHaveAttribute("href", "/demo");
    });

    test("navigates to signup page", async ({ page }) => {
        await page.goto("/");

        await page.getByRole("link", {
            name: /make an account/i,
        }).click();

        await expect(page).toHaveURL(/\/signup$/);
    });

    test("renders footer", async ({ page }) => {
        await page.goto("/");

        const currentYear = new Date().getFullYear();

        await expect(
            page.getByText(`© ${currentYear} Doc Intelligence`)
        ).toBeVisible();
    });
});