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
