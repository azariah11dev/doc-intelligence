import { test, expect } from "@playwright/test";

test.describe("Features Page", () => {
    test("renders page heading", async ({ page }) => {
        await page.goto("/features");

        await expect(
            page.getByRole("heading", {
                name: /features/i,
            })
        ).toBeVisible();
    });

    test("renders page description", async ({ page }) => {
        await page.goto("/features");

        await expect(
            page.getByText(
                /powerful tools designed to help you extract meaning/i
            )
        ).toBeVisible();
    });

    test("renders all feature cards", async ({ page }) => {
        await page.goto("/features");

        const features = [
            "Smart Document Upload",
            "Intelligent Processing",
            "Natural Language Questions",
            "Semantic Context Retrieval",
            "Grounded Answer Generation",
            "Verified Citations",
        ];

        for (const feature of features) {
            await expect(
                page.getByRole("heading", {
                    name: feature,
                })
            ).toBeVisible();
        }
    });

    test("renders Smart Document Upload feature", async ({
        page,
    }) => {
        await page.goto("/features");

        await expect(
            page.getByText(
                /upload pdfs, docx, txt, or images/i
            )
        ).toBeVisible();
    });

    test("renders Intelligent Processing feature", async ({
        page,
    }) => {
        await page.goto("/features");

        await expect(
            page.getByText(
                /automatic text extraction, chunking, and embedding/i
            )
        ).toBeVisible();
    });

    test("renders Verified Citations feature", async ({
        page,
    }) => {
        await page.goto("/features");

        await expect(
            page.getByText(
                /every answer includes exact citations/i
            )
        ).toBeVisible();
    });

    test("shows exactly six feature cards", async ({
        page,
    }) => {
        await page.goto("/features");

        const cards = page.getByRole("heading", {
            level: 2,
        });

        await expect(cards).toHaveCount(6);
    });
});