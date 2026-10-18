import { test, expect } from "../fixtures/authenticated";

test.describe("Ticket Page", () => {
    test("renders page", async ({ page }) => {
        await page.addInitScript(() => {
            localStorage.setItem("role", "Admin");
        });

        await page.goto("/ticket");

        await expect(
            page.getByRole("heading", {
                name: /raise an it ticket/i,
            })
        ).toBeVisible();
    });

    test("shows submitting state", async ({ page }) => {
        await page.route("**/contact/ticket", async (route) => {
            await new Promise((r) => setTimeout(r, 1000));

            await route.fulfill({
                status: 200,
                body: "{}",
            });
        });

        await page.goto("/ticket");

        await page.getByLabel("Subject").selectOption("chat");
        await page.getByLabel("Description").fill("Issue");
        await page.getByLabel("Priority").selectOption("high");

        await page.getByRole("button", {
            name: /submit ticket/i,
        }).click();

        await expect(
            page.getByRole("button", {
                name: /submitting/i,
            })
        ).toBeDisabled();
    });

    test("shows admin link", async ({ page }) => {
        await page.addInitScript(() => {
            localStorage.setItem("role", "Admin");
        });

        await page.goto("/ticket");

        await expect(
            page.getByRole("link", {
                name: /view tickets/i,
            })
        ).toHaveAttribute("href", "/submitted_tickets");
    });

    test("hides admin link for users", async ({ page }) => {
        await page.addInitScript(() => {
            localStorage.setItem("role", "User");
        });

        await page.goto("/ticket");

        await expect(
            page.getByRole("link", {
                name: /view tickets/i,
            })
        ).toHaveCount(0);
    });

    test("submits ticket successfully", async ({ page }) => {
        await page.addInitScript(() => {
            localStorage.setItem("username", "john");
            localStorage.setItem("email", "john@test.com");
        });

        await page.route(
            "**/contact/ticket",
            async (route) => {
                await route.fulfill({
                    status: 200,
                    contentType: "application/json",
                    body: "{}",
                });
            }
        );

        await page.goto("/ticket");

        await page
            .getByLabel("Subject")
            .selectOption("chat");

        await page
            .getByLabel("Description")
            .fill("Chat issue");

        await page
            .getByLabel("Priority")
            .selectOption("high");

        await page.getByRole("button", {
            name: /submit ticket/i,
        }).click();

        await expect(
            page.getByText(/ticket submitted successfully/i)
        ).toBeVisible();
    });

    test("shows backend error", async ({ page }) => {
        await page.route(
            "**/contact/ticket",
            async (route) => {
                await route.fulfill({
                    status: 400,
                    contentType: "application/json",
                    body: JSON.stringify({
                        detail: "Backend Error",
                    }),
                });
            }
        );

        await page.goto("/ticket");

        await page
            .getByLabel("Subject")
            .selectOption("chat");

        await page
            .getByLabel("Description")
            .fill("Issue");

        await page
            .getByLabel("Priority")
            .selectOption("high");

        await page.getByRole("button", {
            name: /submit ticket/i,
        }).click();

        await expect(
            page.getByText("Backend Error")
        ).toBeVisible();
    });

    test("uploads attachment", async ({ page }) => {
        await page.goto("/ticket");

        await page
            .getByLabel(/add relevant attachment/i)
            .setInputFiles({
                name: "test.txt",
                mimeType: "text/plain",
                buffer: Buffer.from("hello"),
            });

        const fileCount = await page
            .locator('input[type="file"]')
            .evaluate(
                (el: HTMLInputElement) =>
                    el.files?.length ?? 0
            );

        expect(fileCount).toBe(1);
    });
});