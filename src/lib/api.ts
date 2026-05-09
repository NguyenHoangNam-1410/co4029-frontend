import { useQuery } from "@tanstack/react-query";
import { authenticatedFetch } from "./auth";

async function apiFetch<T>(path: string): Promise<T> {
  const res = await authenticatedFetch(path);

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`API ${res.status}: ${text || res.statusText}`);
  }

  return res.json() as Promise<T>;
}

/* ── Types aligned to backend schemas ── */

export interface Course {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  status: "draft" | "published" | "archived";
}

export interface CourseStatus {
  course_id: string;
  status: "not_started" | "in_progress" | "completed";
  progress_pct: number;
  completed_lessons: number;
  total_lessons: number;
}

export interface Notification {
  id: string;
  type: string;
  title: string;
  body: string | null;
  is_read: boolean;
  created_at: string;
}

export interface ModuleItem {
  id: string;
  module_id: string;
  position: number;
  item_type: "lesson" | "quiz" | "interview";
  lesson_id: string | null;
  quiz_id: string | null;
  interview_config_id: string | null;
}

/* ── Query hooks ── */

export function useMyCourses() {
  return useQuery({
    queryKey: ["courses", "enrolled"],
    queryFn: () => apiFetch<Course[]>("/courses?enrolled=true"),
  });
}

export function useCourseStatus(courseId: string | undefined) {
  return useQuery({
    queryKey: ["courses", courseId, "status"],
    queryFn: () => apiFetch<CourseStatus>(`/courses/${courseId}/status/me`),
    enabled: !!courseId,
  });
}

export function useNotifications() {
  return useQuery({
    queryKey: ["notifications"],
    queryFn: () => apiFetch<Notification[]>("/notifications"),
  });
}

export function useMe() {
  return useQuery({
    queryKey: ["me"],
    queryFn: () => apiFetch<{ id: string; primary_email: string }>("/me"),
    staleTime: 1000 * 60 * 5,
  });
}
