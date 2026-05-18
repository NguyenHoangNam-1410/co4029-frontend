import type { Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

export type AxeViolationNode = {
  target: string[];
  html: string;
  failureSummary: string | null | undefined;
};

export type AxeViolation = {
  id: string;
  impact: string | null | undefined;
  description: string;
  helpUrl: string;
  nodes: AxeViolationNode[];
};

export type AxeResult = {
  url: string;
  violations: AxeViolation[];
  criticalOrSerious: AxeViolation[];
};

export async function scanRoute(page: Page, url: string): Promise<AxeResult> {
  await page.goto(url);
  await page.waitForLoadState("networkidle").catch(() => undefined);

  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();

  const violations: AxeViolation[] = results.violations.map((v) => ({
    id: v.id,
    impact: v.impact,
    description: v.description,
    helpUrl: v.helpUrl,
    nodes: v.nodes.map((node) => ({
      target: node.target.map((t) => String(t)),
      html: node.html,
      failureSummary: node.failureSummary,
    })),
  }));

  const criticalOrSerious = violations.filter(
    (v) => v.impact === "critical" || v.impact === "serious",
  );

  return { url, violations, criticalOrSerious };
}
