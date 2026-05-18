import { describe, expect, it } from "vitest";

import {
  notificationDeepLink,
  parseNotificationBody,
  parseRemediationDeepLink,
} from "@/lib/notifications/deep-link";
import type { Notification } from "@/lib/api/types";

function makeNotification(overrides: Partial<Notification> = {}): Notification {
  return {
    id: "ntf_1",
    user_id: "user_1",
    category: "spaced_repetition",
    title: "Card to revisit",
    body: null,
    entity_type: null,
    entity_id: null,
    channel: "in_app",
    read_at: null,
    created_at: "2026-05-18T10:00:00.000Z",
    ...overrides,
  } as Notification;
}

describe("parseNotificationBody (W5.10)", () => {
  it("parses an SR remediation Markdown body into clickable link segments", () => {
    const body =
      "Bạn cần ôn lại tài liệu sau: " +
      "[Phần 2: Đệ quy](/courses/algorithms/lessons/lsn_42/resources/mat_99?t=180) — chúc bạn học tốt!";

    const segments = parseNotificationBody(body);

    expect(segments).toHaveLength(3);
    expect(segments[0]).toEqual({
      type: "text",
      text: "Bạn cần ôn lại tài liệu sau: ",
    });
    expect(segments[1]).toEqual({
      type: "link",
      label: "Phần 2: Đệ quy",
      url: "/courses/algorithms/lessons/lsn_42/resources/mat_99?t=180",
    });
    expect(segments[2]).toEqual({
      type: "text",
      text: " — chúc bạn học tốt!",
    });
  });

  it("returns plain text when no Markdown link is present", () => {
    const segments = parseNotificationBody("Just a reminder, nothing here.");
    expect(segments).toEqual([
      { type: "text", text: "Just a reminder, nothing here." },
    ]);
  });

  it("returns empty array on null/empty body", () => {
    expect(parseNotificationBody(null)).toEqual([]);
    expect(parseNotificationBody("")).toEqual([]);
  });
});

describe("parseRemediationDeepLink (W5.10)", () => {
  it("extracts ?t= seconds for audio/video remediation links", () => {
    const parsed = parseRemediationDeepLink(
      "/courses/algorithms/lessons/lsn_42/resources/mat_99?t=180",
    );
    expect(parsed?.seconds).toBe(180);
    expect(parsed?.page).toBeNull();
    expect(parsed?.anchor).toBeNull();
  });

  it("extracts ?p= page for pdf/slides remediation links", () => {
    const parsed = parseRemediationDeepLink(
      "/courses/algorithms/lessons/lsn_42/resources/mat_99?p=5",
    );
    expect(parsed?.page).toBe(5);
    expect(parsed?.seconds).toBeNull();
  });

  it("extracts #anchor for html remediation links", () => {
    const parsed = parseRemediationDeepLink(
      "/courses/algorithms/lessons/lsn_42/resources/mat_99#section-2",
    );
    expect(parsed?.anchor).toBe("section-2");
    expect(parsed?.seconds).toBeNull();
    expect(parsed?.page).toBeNull();
  });

  it("returns null for an unparseable URL", () => {
    expect(parseRemediationDeepLink("\u0000not a url")).toBeTypeOf("object");
  });
});

describe("notificationDeepLink (W2.9 regression)", () => {
  it("routes course entity to /courses/{id}", () => {
    const link = notificationDeepLink(
      makeNotification({ entity_type: "course", entity_id: "crs_42" }),
    );
    expect(link).toBe("/courses/crs_42");
  });

  it("routes lesson entity through /courses/learn", () => {
    const link = notificationDeepLink(
      makeNotification({ entity_type: "lesson", entity_id: "lsn_7" }),
    );
    expect(link).toBe("/courses/learn?lessonId=lsn_7");
  });

  it("returns null when entity_type is missing", () => {
    expect(notificationDeepLink(makeNotification())).toBeNull();
  });
});
