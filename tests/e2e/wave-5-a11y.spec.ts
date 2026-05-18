import { test, expect } from "@playwright/test";
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { loginAs, type SeedRole } from "./_helpers/login";
import { resetSeed } from "./_helpers/seed-reset";
import { scanRoute, type AxeResult } from "./_helpers/axe-scan";

type ScanTarget = {
  url: string;
  role: SeedRole;
  label: string;
};

const TARGETS: ScanTarget[] = [
  { url: "/dashboard", role: "student", label: "dashboard" },
  { url: "/courses", role: "student", label: "courses-list" },
  { url: "/notifications", role: "student", label: "notifications" },
  { url: "/settings/profile", role: "student", label: "settings-profile" },
  { url: "/study/cards-due", role: "student", label: "study-cards-due" },
  { url: "/dashboard/sr", role: "student", label: "sr-dashboard" },
  { url: "/admin/stats", role: "admin", label: "admin-stats" },
  { url: "/admin/users", role: "admin", label: "admin-users" },
  { url: "/admin/ai-costs", role: "admin", label: "admin-ai-costs" },
  { url: "/teacher/courses", role: "teacher", label: "teacher-courses" },
];

const REPORT_PATH = resolve(
  process.cwd(),
  ".evidence/W5.13-axe-violations.json",
);

const aggregate: Record<string, AxeResult> = {};

test.describe("wave-5-a11y", () => {
  test.beforeAll(async () => {
    await resetSeed();
  });

  test.afterAll(async () => {
    try {
      mkdirSync(dirname(REPORT_PATH), { recursive: true });
      writeFileSync(REPORT_PATH, JSON.stringify(aggregate, null, 2));
    } catch {
      void 0;
    }
  });

  for (const target of TARGETS) {
    test(`axe scan: ${target.label} (${target.url})`, async ({ page }) => {
      await loginAs(page, target.role);
      const result = await scanRoute(page, target.url);
      aggregate[target.label] = result;

      expect.soft(
        result.criticalOrSerious,
        `Critical/serious axe violations on ${target.url}: ${JSON.stringify(
          result.criticalOrSerious,
          null,
          2,
        )}`,
      ).toEqual([]);

      expect(result.criticalOrSerious.length).toBe(0);
    });
  }
});
