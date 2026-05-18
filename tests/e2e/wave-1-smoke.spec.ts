import { test, expect } from "@playwright/test";
import { loginAs } from "./_helpers/login";
import { resetSeed } from "./_helpers/seed-reset";

const SEEDED_KPI_LABELS = [
  "Người dùng",
  "Khoá học",
  "Đăng ký",
  "Tài liệu",
  "Lượt làm quiz",
] as const;

const SEEDED_USER_EMAILS = [
  "e2e-admin@example.com",
  "e2e-teacher@example.com",
  "e2e-student@example.com",
] as const;

const SEEDED_STUDENT_INITIALS = "ES";

test.describe("wave-1-smoke", () => {
  test.beforeAll(async () => {
    await resetSeed();
  });

  test("healthz status visible in /admin/health", async ({ page }) => {
    await loginAs(page, "admin");
    await page.goto("/admin/health");

    await expect(
      page.getByRole("heading", { name: /Trạng thái hệ thống/i }),
    ).toBeVisible({ timeout: 10_000 });

    await expect(page.getByText("Kiểm tra sức khỏe API")).toBeVisible({
      timeout: 10_000,
    });
    await expect(page.getByText("Kiểm tra sẵn sàng")).toBeVisible({
      timeout: 10_000,
    });

    await expect(
      page.locator("span").filter({ hasText: /^ok$/ }).first(),
    ).toBeVisible({ timeout: 10_000 });
  });

  test("dashboard greets seeded student", async ({ page }) => {
    await loginAs(page, "student");
    await page.goto("/dashboard");

    await expect(
      page.getByRole("heading", { level: 1, name: /Welcome back, E2E/i }),
    ).toBeVisible({ timeout: 10_000 });

    await expect(
      page.getByText(SEEDED_STUDENT_INITIALS, { exact: true }).first(),
    ).toBeVisible({ timeout: 10_000 });
  });

  test("admin stats overview shows 5 KPI cards", async ({ page }) => {
    await loginAs(page, "admin");
    await page.goto("/admin/stats");

    await expect(
      page.getByRole("heading", { name: /Tổng quan hệ thống/i }),
    ).toBeVisible({ timeout: 10_000 });

    for (const label of SEEDED_KPI_LABELS) {
      await expect(page.getByText(label, { exact: true }).first()).toBeVisible({
        timeout: 10_000,
      });
    }
  });

  test("admin users list renders seeded rows", async ({ page }) => {
    await loginAs(page, "admin");
    await page.goto("/admin/users");

    await expect(
      page.getByRole("heading", { name: /Quản lý người dùng/i }),
    ).toBeVisible({ timeout: 10_000 });

    await expect
      .poll(
        async () => page.locator('[data-slot="infinite-list-item"]').count(),
        { timeout: 10_000 },
      )
      .toBeGreaterThanOrEqual(SEEDED_USER_EMAILS.length);

    for (const email of SEEDED_USER_EMAILS) {
      await expect(page.getByText(email)).toBeVisible({ timeout: 10_000 });
    }
  });

  test("login page renders Google OAuth button", async ({ page }) => {
    await page.goto("/login");

    await expect(
      page.getByRole("button", { name: /Continue with Google/i }),
    ).toBeVisible({ timeout: 10_000 });
  });
});
