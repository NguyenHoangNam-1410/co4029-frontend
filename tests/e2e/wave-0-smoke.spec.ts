import { test, expect } from "@playwright/test";
import { loginAs } from "./_helpers/login";
import { resetSeed } from "./_helpers/seed-reset";

test.describe("wave-0-smoke", () => {
  test.beforeAll(async () => {
    await resetSeed();
  });

  test("admin reaches dashboard after programmatic login", async ({ page }) => {
    await loginAs(page, "admin");

    await page.goto("/dashboard");

    await expect(page).toHaveURL(/\/dashboard/);
    await expect(
      page.getByRole("heading", { level: 1, name: /welcome back/i }),
    ).toBeVisible();
  });
});
