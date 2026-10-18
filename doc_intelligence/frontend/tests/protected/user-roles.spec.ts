import { test, expect } from "@playwright/test";

test.describe("User Management", () => {
    const users = [
        {
            id: "1",
            username: "john",
            email: "john@test.com",
            role: "User",
        },
    ];

    test.beforeEach(async ({ page }) => {
        await page.addInitScript(() => {
            localStorage.setItem("access_token", "token");
        });
    });

    test("renders users", async ({ page }) => {
        await page.route("**/auth/all_users", async (route) => {
            await route.fulfill({
                status: 200,
                contentType: "application/json",
                body: JSON.stringify(users),
            });
        });

        await page.goto("/user_roles");

        await expect(page.getByText("john")).toBeVisible();
        await expect(page.getByText("john@test.com")).toBeVisible();
    });

    test("shows loading state", async ({ page }) => {
        await page.route("**/auth/all_users", async (route) => {
            await new Promise((resolve) =>
                setTimeout(resolve, 1000)
            );

            await route.fulfill({
                status: 200,
                body: JSON.stringify(users),
            });
        });

        await page.goto("/user_roles");

        await expect(
            page.getByText(/loading users/i)
        ).toBeVisible();
    });

    test("updates role", async ({ page }) => {
        await page.route("**/auth/all_users", async (route) => {
            await route.fulfill({
                status: 200,
                body: JSON.stringify(users),
            });
        });

        await page.route("**/auth/assign_role", async (route) => {
            await route.fulfill({
                status: 200,
                body: JSON.stringify({
                    message: "updated",
                }),
            });
        });

        await page.goto("/user_roles");

        const select = page.getByRole("combobox");

        await select.selectOption("Admin");

        await expect(select).toHaveValue("Admin");
    });

    test("opens delete modal", async ({ page }) => {
        await page.route("**/auth/all_users", async (route) => {
            await route.fulfill({
                status: 200,
                body: JSON.stringify(users),
            });
        });

        await page.goto("/user_roles");

        await page.getByRole("button", {
            name: /^delete$/i,
        }).click();

        await expect(
            page.getByText(/delete user/i)
        ).toBeVisible();
    });

    test("closes delete modal", async ({ page }) => {
        await page.route("**/auth/all_users", async (route) => {
            await route.fulfill({
                status: 200,
                body: JSON.stringify(users),
            });
        });

        await page.goto("/user_roles");

        await page.getByRole("button", {
            name: /^delete$/i,
        }).click();

        await page.getByRole("button", {
            name: /cancel/i,
        }).click();

        await expect(
            page.getByText(/delete user/i)
        ).toHaveCount(0);
    });

    test("shows error state", async ({ page }) => {
        await page.route("**/auth/all_users", async (route) => {
            await route.fulfill({
                status: 500,
                body: "{}",
            });
        });

        await page.goto("/user_roles");

        await expect(
            page.getByText(
                /could not load users/i
            )
        ).toBeVisible();
    });

    test("deletes a user", async ({ page }) => {
        page.once("dialog", async (dialog) => {
            expect(dialog.message()).toContain("User deleted");
            await dialog.accept();
        });

        await page.route("**/auth/all_users", async (route) => {
            await route.fulfill({
                status: 200,
                body: JSON.stringify(users),
            });
        });

        await page.route("**/auth/delete_user", async (route) => {
            await route.fulfill({
                status: 200,
                body: JSON.stringify({
                    message: "User deleted",
                }),
            });
        });

        await page.goto("/user_roles");

        await page.getByRole("button", {
            name: /^delete$/i,
        }).click();

        await page.getByRole("button", {
            name: /^delete$/i,
        }).last().click();

        await expect(
            page.getByText("john")
        ).toHaveCount(0);
    });
});