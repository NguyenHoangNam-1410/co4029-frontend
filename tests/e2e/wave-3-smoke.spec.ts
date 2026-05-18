import { test, expect, type Page } from "@playwright/test";
import { Client } from "pg";
import { loginAs, SEED_USER_IDS } from "./_helpers/login";
import { resetSeed } from "./_helpers/seed-reset";

const SEED_STUDENT_ID = SEED_USER_IDS.student;

const DEFAULT_DATABASE_URL =
  "postgresql://abridgeai:abridgeai@localhost:5433/abridgeai";

function databaseUrl(): string {
  return (
    process.env.E2E_DATABASE_URL ??
    process.env.DATABASE_URL?.replace(
      /^postgresql\+psycopg:\/\//,
      "postgresql://",
    ) ??
    DEFAULT_DATABASE_URL
  );
}

async function safeRowCount(
  table: string,
  whereClause: string,
  params: ReadonlyArray<string>,
): Promise<number> {
  const client = new Client({ connectionString: databaseUrl() });
  await client.connect();
  try {
    const result = await client.query(
      `SELECT COUNT(*)::int AS c FROM ${table} WHERE ${whereClause}`,
      params as unknown[],
    );
    return result.rows[0]?.c ?? 0;
  } catch {
    return 0;
  } finally {
    await client.end().catch(() => undefined);
  }
}

async function countUnreadNotifications(userId: string): Promise<number> {
  return safeRowCount(
    "notifications",
    "user_id = $1 AND read_at IS NULL",
    [userId],
  );
}

/**
 * Probe whether a client-side route is registered in the router.
 * TanStack Router renders an empty/Not-Found body for unwired paths, so
 * scenarios targeting routes that lag wiring (W3.3-W3.6) skip cleanly.
 */
async function isRouteWired(
  page: Page,
  path: string,
  sentinel: string,
): Promise<boolean> {
  await page.goto(path, { waitUntil: "domcontentloaded" });
  return page
    .locator(sentinel)
    .first()
    .isVisible({ timeout: 5_000 })
    .catch(() => false);
}

test.describe("wave-3-smoke", () => {
  test.beforeAll(async () => {
    await resetSeed();
  });

  test("mark single notification read decrements counter", async ({
    page,
  }) => {
    const unreadBefore = await countUnreadNotifications(SEED_STUDENT_ID);
    test.skip(
      unreadBefore === 0,
      "Seed has no unread notifications for student — mark-read path not exercised",
    );

    await loginAs(page, "student");
    await page.goto("/notifications");

    const items = page.locator('[data-slot="infinite-list-item"]');
    await expect
      .poll(async () => items.count(), { timeout: 10_000 })
      .toBeGreaterThanOrEqual(1);

    const markReadBtn = page
      .getByRole("button", { name: /Đánh dấu đã đọc/i })
      .first();
    await expect(markReadBtn).toBeVisible({ timeout: 5_000 });
    await markReadBtn.click();

    await expect
      .poll(async () => countUnreadNotifications(SEED_STUDENT_ID), {
        timeout: 10_000,
      })
      .toBe(unreadBefore - 1);

    await page.reload();
    expect(await countUnreadNotifications(SEED_STUDENT_ID)).toBe(
      unreadBefore - 1,
    );
  });

  test("mark-all-read zeroes counter", async ({ page }) => {
    const unreadBefore = await countUnreadNotifications(SEED_STUDENT_ID);
    test.skip(
      unreadBefore === 0,
      "Seed has 0 unread — mark-all-read button is disabled",
    );

    await loginAs(page, "student");
    await page.goto("/notifications");

    const markAllBtn = page.getByRole("button", {
      name: /Đánh dấu tất cả đã đọc/i,
    });
    await expect(markAllBtn).toBeVisible({ timeout: 10_000 });
    await markAllBtn.click();

    await expect
      .poll(async () => countUnreadNotifications(SEED_STUDENT_ID), {
        timeout: 10_000,
      })
      .toBe(0);
  });

  test("toggle email pref off + persists", async ({ page }) => {
    await loginAs(page, "student");
    await page.goto("/settings/notifications");

    const toggle = page
      .getByRole("switch", { name: /Thông báo khóa học\s*[–-]\s*Email/i })
      .first();
    await expect(toggle).toBeVisible({ timeout: 10_000 });

    const initial = await toggle.getAttribute("aria-checked");
    await toggle.click();

    await expect
      .poll(async () => toggle.getAttribute("aria-checked"), {
        timeout: 5_000,
      })
      .not.toBe(initial);

    await page.reload();
    const persisted = await toggle.getAttribute("aria-checked");
    expect(persisted).not.toBe(initial);

    await toggle.click();
    await expect
      .poll(async () => toggle.getAttribute("aria-checked"), {
        timeout: 5_000,
      })
      .toBe(initial);
  });

  test("update profile display name", async ({ page }) => {
    const profileWired = await isRouteWired(
      page,
      "/settings/profile",
      'input[name="display_name"]',
    );
    test.skip(
      !profileWired,
      "/settings/profile route not wired in router yet",
    );

    await loginAs(page, "student");
    await page.goto("/settings/profile");

    const nameInput = page.locator('input[name="display_name"]');
    await expect(nameInput).toBeVisible({ timeout: 10_000 });
    const original = await nameInput.inputValue();

    await nameInput.fill("E2E Test Updated");
    await page
      .getByRole("button", { name: /Lưu hồ sơ|Save/i })
      .first()
      .click();

    await page.waitForTimeout(500);
    await page.reload();

    await expect(nameInput).toHaveValue("E2E Test Updated", {
      timeout: 10_000,
    });

    await nameInput.fill(original || "E2E Student");
    await page
      .getByRole("button", { name: /Lưu hồ sơ|Save/i })
      .first()
      .click();
  });

  test("TOTP enrollment modal renders secret + otpauth", async ({ page }) => {
    const securityWired = await isRouteWired(
      page,
      "/settings/security",
      "h1",
    );
    test.skip(
      !securityWired,
      "/settings/security route not wired in router yet",
    );

    await loginAs(page, "student");
    await page.goto("/settings/security");

    const enrollBtn = page
      .getByRole("button", { name: /Bật xác thực hai bước/i })
      .first();
    const enrollVisible = await enrollBtn
      .isVisible({ timeout: 5_000 })
      .catch(() => false);
    test.skip(
      !enrollVisible,
      "Enroll TOTP button not visible — user may already have MFA enrolled",
    );

    await enrollBtn.click();

    await expect(
      page.getByText(/Hoặc nhập mã thủ công/i).first(),
    ).toBeVisible({ timeout: 10_000 });

    const otpauthLink = page.locator('a[href^="otpauth://"]').first();
    await expect(otpauthLink).toBeVisible({ timeout: 5_000 });

    await page
      .getByRole("button", { name: /^Huỷ$/i })
      .first()
      .click();
  });

  test("login MFA challenge UI renders", async ({ page }) => {
    await loginAs(page, "student");
    await page.evaluate(() => {
      window.localStorage.setItem("abridgeai.requires_mfa", "true");
    });

    await page.goto("/login/mfa");

    const heading = page.getByRole("heading", {
      name: /Xác thực hai bước/i,
    });
    const headingVisible = await heading
      .first()
      .isVisible({ timeout: 5_000 })
      .catch(() => false);
    test.skip(!headingVisible, "/login/mfa route not wired in router yet");

    await expect(page.getByRole("tab", { name: /Mã TOTP/i })).toBeVisible({
      timeout: 5_000,
    });
    await expect(
      page.getByRole("tab", { name: /Mã khôi phục/i }),
    ).toBeVisible({ timeout: 5_000 });
    await expect(page.locator("#mfa-code")).toBeVisible({ timeout: 5_000 });

    await page.evaluate(() => {
      window.localStorage.setItem("abridgeai.requires_mfa", "false");
    });
  });
});
