import type { Notification } from "@/lib/api/types";

export function notificationDeepLink(notification: Notification): string | null {
  if (!notification.entity_type || !notification.entity_id) return null;
  switch (notification.entity_type) {
    case "course":
      return `/courses/${notification.entity_id}`;
    case "lesson":
      return `/courses/learn?lessonId=${notification.entity_id}`;
    case "quiz":
      return `/quizzes/${notification.entity_id}`;
    case "interview":
      return `/interview-sessions/${notification.entity_id}`;
    case "material":
      return `/materials/${notification.entity_id}`;
    case "enrollment":
      return `/me/enrollments`;
    case "career_path":
      return `/career-paths/${notification.entity_id}`;
    default:
      return null;
  }
}

/**
 * A segment of a parsed Markdown notification body.
 * - "text": plain text run.
 * - "link": Markdown link `[label](url)`.
 */
export type MarkdownSegment =
  | { type: "text"; text: string }
  | { type: "link"; label: string; url: string };

const MARKDOWN_LINK_RE = /\[([^\]]+)\]\(([^)\s]+)\)/g;

/**
 * Minimal `[label](url)` parser for SR remediation notification bodies
 * (phase-7-5-sr.md §5). A full Markdown dependency is intentionally avoided.
 */
export function parseNotificationBody(body: string | null | undefined): MarkdownSegment[] {
  if (!body) return [];
  const segments: MarkdownSegment[] = [];
  let cursor = 0;
  MARKDOWN_LINK_RE.lastIndex = 0;
  let match: RegExpExecArray | null = MARKDOWN_LINK_RE.exec(body);
  while (match) {
    if (match.index > cursor) {
      segments.push({ type: "text", text: body.slice(cursor, match.index) });
    }
    segments.push({ type: "link", label: match[1], url: match[2] });
    cursor = match.index + match[0].length;
    match = MARKDOWN_LINK_RE.exec(body);
  }
  if (cursor < body.length) {
    segments.push({ type: "text", text: body.slice(cursor) });
  }
  return segments;
}

export interface RemediationDeepLink {
  pathname: string;
  seconds: number | null;
  page: number | null;
  anchor: string | null;
}

/**
 * Parse an SR remediation link (phase-7-5-sr.md §5):
 *   `.../resources/{mid}?t={s}` | `?p={page}` | `#{anchor}`.
 * Uses a placeholder base because the spec mandates relative paths.
 */
export function parseRemediationDeepLink(url: string): RemediationDeepLink | null {
  try {
    const u = new URL(url, "http://placeholder.local");
    const t = u.searchParams.get("t");
    const p = u.searchParams.get("p");
    const seconds = t !== null ? Number(t) : null;
    const page = p !== null ? Number(p) : null;
    const anchor = u.hash ? u.hash.slice(1) : null;
    return {
      pathname: u.pathname + u.search,
      seconds: seconds !== null && Number.isFinite(seconds) ? seconds : null,
      page: page !== null && Number.isFinite(page) ? page : null,
      anchor: anchor && anchor.length > 0 ? anchor : null,
    };
  } catch {
    return null;
  }
}
