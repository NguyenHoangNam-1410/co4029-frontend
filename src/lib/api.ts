import { useQuery, useQueries } from "@tanstack/react-query";
import { authenticatedFetch } from "./auth";

export async function apiFetch<T>(path: string): Promise<T> {
  const res = await authenticatedFetch(path);

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`API ${res.status}: ${text || res.statusText}`);
  }

  return res.json() as Promise<T>;
}

/* ════════════════════════════════════════════
   Types — aligned to backend schemas
   ════════════════════════════════════════════ */

export interface InstructorRead {
  user_id: string;
  display_name: string;
  bio: string | null;
}

/** CourseRead — from GET /courses (list, no instructor) */
export interface Course {
  id: string;
  organization_id: string;
  org_unit_id: string | null;
  owner_user_id: string;
  slug: string;
  title: string;
  description: string | null;
  status: "draft" | "published" | "archived";
  level: string | null;
  thumbnail_object_id: string | null;
  estimated_minutes: number | null;
  expected_completion_days: number | null;
  enrollment_cap: number | null;
  created_at: string;
  updated_at: string;
}

/** CourseDetailRead — from GET /courses/{id} and GET /courses/by-slug/{slug} */
export interface CourseDetail extends Course {
  instructor: InstructorRead | null;
}

export interface LearningOutcome {
  id: string;
  course_id: string;
  position: number;
  outcome_text: string;
  created_at: string;
  updated_at: string;
}

export interface CourseContentLesson {
  id: string;
  slug: string;
  title: string;
  summary: string | null;
  difficulty: string | null;
  estimated_minutes: number | null;
  status: string;
}

export interface CourseContentItem {
  id: string;
  item_type: "lesson" | "quiz" | "interview";
  lesson_id: string | null;
  quiz_id: string | null;
  interview_config_id: string | null;
  position: number;
  unlock_rule_json: Record<string, unknown>;
  lesson: CourseContentLesson | null;
}

export interface CourseContentModule {
  id: string;
  title: string;
  description: string | null;
  position: number;
  status: string;
  estimated_minutes: number | null;
  items: CourseContentItem[];
}

export interface CourseContent {
  course_id: string;
  modules: CourseContentModule[];
}

export interface CourseTag {
  id: string;
  slug: string;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface CourseStatus {
  student_id: string;
  course_id: string;
  progress_percent: number;
  final_grade: string | null;
  retention_estimate: number | null;
  review_compliance_rate: number | null;
  at_risk_level: string;
  last_activity_at: string | null;
  last_computed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Notification {
  id: string;
  type: string;
  title: string;
  body: string | null;
  is_read: boolean;
  created_at: string;
}

/* ════════════════════════════════
   Helpers
   ════════════════════════════════ */

export function formatMinutes(mins: number | null | undefined): string {
  if (!mins) return "";
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

export function deriveCourseStatus(progressPercent: number): "not_started" | "in_progress" | "completed" {
  if (progressPercent >= 100) return "completed";
  if (progressPercent > 0) return "in_progress";
  return "not_started";
}

/* ════════════════════════════════
   Hooks
   ════════════════════════════════ */

/** All courses in the org (for the catalog). */
export function useCourseList() {
  return useQuery({
    queryKey: ["courses"],
    queryFn: () => apiFetch<Course[]>("/courses"),
    staleTime: 1000 * 60 * 5,
  });
}

/** Courses the current user is enrolled in (admin-assigned). */
export function useMyCourses() {
  return useQuery({
    queryKey: ["courses", "mine"],
    queryFn: () => apiFetch<Course[]>("/me/courses"),
    staleTime: 1000 * 60 * 2,
  });
}

/** Course detail with instructor — by slug. */
export function useCourseBySlug(slug: string | undefined) {
  return useQuery({
    queryKey: ["courses", "by-slug", slug],
    queryFn: () => apiFetch<CourseDetail>(`/courses/by-slug/${slug}`),
    enabled: !!slug,
    staleTime: 1000 * 60 * 5,
  });
}

/** Batched course content: modules + items + lessons in one request. */
export function useCourseContent(courseId: string | undefined) {
  return useQuery({
    queryKey: ["courses", courseId, "content"],
    queryFn: () => apiFetch<CourseContent>(`/courses/${courseId}/content`),
    enabled: !!courseId,
    staleTime: 1000 * 60 * 10,
  });
}

export function useCourseOutcomes(courseId: string | undefined) {
  return useQuery({
    queryKey: ["courses", courseId, "outcomes"],
    queryFn: () => apiFetch<LearningOutcome[]>(`/courses/${courseId}/outcomes`),
    enabled: !!courseId,
    staleTime: 1000 * 60 * 10,
  });
}

export function useCourseTags(courseId: string | undefined) {
  return useQuery({
    queryKey: ["courses", courseId, "tags"],
    queryFn: () => apiFetch<CourseTag[]>(`/courses/${courseId}/tags`),
    enabled: !!courseId,
    staleTime: 1000 * 60 * 10,
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

/* ── Legacy batch hooks kept for any future use ── */
export function useModuleItemsBatch(moduleIds: string[]) {
  return useQueries({
    queries: moduleIds.map((moduleId) => ({
      queryKey: ["modules", moduleId, "items"],
      queryFn: () =>
        apiFetch<Array<{
          id: string;
          module_id: string;
          item_type: "lesson" | "quiz" | "interview";
          lesson_id: string | null;
          position: number;
        }>>(`/modules/${moduleId}/items`),
      staleTime: 1000 * 60 * 10,
    })),
  });
}
