import { test, expect } from "@playwright/test";

test.describe("Navbar", () => {
  test("renders navbar", async ({ page }) => {
    await page.goto("/");

    await expect(
      page.getByRole("link", {
        name: /doc intelligence/i,
      })
    ).toBeVisible();
  });

  test("renders logo", async ({ page }) => {
    await page.goto("/");

    const logo = page.getByAltText(
      /taskforge logo/i
    );

    await expect(logo).toBeVisible();

    await expect(logo).toHaveAttribute(
      "src",
      "/logo.png"
    );
  });

  test("renders navigation links", async ({
    page,
  }) => {
    await page.goto("/");

    await expect(
      page.getByRole("link", {
        name: /features/i,
      })
    ).toHaveAttribute(
      "href",
      "/features"
    );

    await expect(
      page.getByRole("link", {
        name: /about/i,
      })
    ).toHaveAttribute(
      "href",
      "/about"
    );

    await expect(
      page.getByRole("link", {
        name: /contacts/i,
      })
    ).toHaveAttribute(
      "href",
      "/contacts"
    );

    await expect(
      page.getByRole("link", {
        name: /login/i,
      })
    ).toHaveAttribute(
      "href",
      "/login"
    );
  });

  test("navigates to home page from logo text", async ({
    page,
  }) => {
    await page.goto("/features");

    await page.getByRole("link", {
      name: /doc intelligence/i,
    }).click();

    await expect(page).toHaveURL(/\/$/);
  });

  test("navigates to features page", async ({
    page,
  }) => {
    await page.goto("/");

    await page.getByRole("link", {
      name: /features/i,
    }).click();

    await expect(page).toHaveURL(
      /\/features$/
    );
  });

  test("navigates to about page", async ({
    page,
  }) => {
    await page.goto("/");

    await page.getByRole("link", {
      name: /about/i,
    }).click();

    await expect(page).toHaveURL(
      /\/about$/
    );
  });

  test("navigates to contacts page", async ({
    page,
  }) => {
    await page.goto("/");

    await page.getByRole("link", {
      name: /contacts/i,
    }).click();

    await expect(page).toHaveURL(
      /\/contacts$/
    );
  });

  test("navigates to login page", async ({
    page,
  }) => {
    await page.goto("/");

    await page.getByRole("link", {
      name: /login/i,
    }).click();

    await expect(page).toHaveURL(
      /\/login$/
    );
  });
});