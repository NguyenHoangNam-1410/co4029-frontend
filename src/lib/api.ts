import { useMutation, useQuery, useQueryClient, useQueries } from "@tanstack/react-query";
import { authenticatedFetch } from "./auth";

export async function apiFetch<T>(path: string): Promise<T> {
  const res = await authenticatedFetch(path);

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`API ${res.status}: ${text || res.statusText}`);
  }

  return res.json() as Promise<T>;
}

export async function apiPost<T>(path: string, body?: unknown): Promise<T> {
  const res = await authenticatedFetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`API ${res.status}: ${text || res.statusText}`);
  }
  return res.json() as Promise<T>;
}

export async function apiPatch<T>(path: string, body?: unknown): Promise<T> {
  const res = await authenticatedFetch(path, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`API ${res.status}: ${text || res.statusText}`);
  }
  return res.json() as Promise<T>;
}

export async function apiDelete(path: string): Promise<void> {
  const res = await authenticatedFetch(path, { method: "DELETE" });
  if (!res.ok && res.status !== 204) {
    const text = await res.text().catch(() => "");
    throw new Error(`API ${res.status}: ${text || res.statusText}`);
  }
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
  notes_markdown: string | null;
  lesson_type: string;
  difficulty: string | null;
  estimated_minutes: number | null;
  primary_material_id: string | null;
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

/* ── Progress / lesson viewer types ── */

export interface LessonProgressSummary {
  lesson_id: string;
  status: "not_started" | "in_progress" | "completed";
  progress_percent: number;
  completed_at: string | null;
}

export interface CourseLessonsProgress {
  course_id: string;
  lessons: LessonProgressSummary[];
}

export interface ModuleStatusSummary {
  module_id: string;
  lesson_completion_ratio: number;
  quiz_passed: boolean;
  interview_passed: boolean;
  completed_at: string | null;
}

export interface CourseModulesStatus {
  course_id: string;
  modules: ModuleStatusSummary[];
}

export interface LessonResource {
  id: string;
  lesson_id: string;
  title: string;
  resource_type: string;
  storage_object_id: string | null;
  position: number;
  visible_to_students: boolean;
  created_at: string;
  updated_at: string;
}

export interface StreamUrlResponse {
  stream_url: string;
  expires_at: string;
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

/** Bulk lesson progress for all lessons in a course. 404 → null (not enrolled). */
export function useCourseLessonsProgress(courseId: string | undefined) {
  return useQuery({
    queryKey: ["courses", courseId, "lessons-progress"],
    queryFn: async () => {
      try {
        return await apiFetch<CourseLessonsProgress>(`/courses/${courseId}/lessons/progress/me`);
      } catch (e: unknown) {
        if ((e as { status?: number }).status === 404) return null;
        throw e;
      }
    },
    enabled: !!courseId,
    staleTime: 1000 * 30,
  });
}

/** Bulk module status for all modules in a course. */
export function useCourseModulesStatus(courseId: string | undefined) {
  return useQuery({
    queryKey: ["courses", courseId, "modules-status"],
    queryFn: async () => {
      try {
        return await apiFetch<CourseModulesStatus>(`/courses/${courseId}/modules/status/me`);
      } catch (e: unknown) {
        if ((e as { status?: number }).status === 404) return null;
        throw e;
      }
    },
    enabled: !!courseId,
    staleTime: 1000 * 30,
  });
}

/** Downloadable resources attached to a lesson. */
export function useLessonResources(lessonId: string | undefined) {
  return useQuery({
    queryKey: ["lessons", lessonId, "resources"],
    queryFn: () => apiFetch<LessonResource[]>(`/lessons/${lessonId}/resources`),
    enabled: !!lessonId,
    staleTime: 1000 * 60 * 5,
  });
}

/** Presigned stream URL for a material (video). Returns null if no material. */
export function useMaterialStreamUrl(materialId: string | null | undefined) {
  return useQuery({
    queryKey: ["materials", materialId, "stream-url"],
    queryFn: () => apiFetch<StreamUrlResponse>(`/materials/${materialId}/stream-url`),
    enabled: !!materialId,
    staleTime: 1000 * 60 * 4, // expire before the typical 5-min presigned window
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

/* ════════════════════════════════════════════
   Teacher / Authoring API
   ════════════════════════════════════════════ */

export interface MaterialStatus {
  material_id: string;
  current_version_id: string | null;
  processing_status: string | null;
  processing_error: string | null;
  active_job_id: string | null;
  active_job_status: string | null;
}

export interface LearningMaterial {
  id: string;
  lesson_id: string;
  title: string;
  material_type: string;
  ai_processing_enabled: boolean;
  visible_to_students: boolean;
  current_version_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProcessingSummary {
  lesson_id: string;
  materials_total: number;
  versions_total: number;
  pending_versions: number;
  processing_versions: number;
  completed_versions: number;
  failed_versions: number;
}

export interface UploadUrlResponse {
  storage_object: { id: string; object_key: string; bucket: string };
  upload_url: string;
  expires_at: string;
}

export const LESSON_TYPES = [
  { value: "lecture", label: "Lecture" },
  { value: "lab", label: "Lab" },
  { value: "homework", label: "Homework" },
  { value: "reading", label: "Reading" },
  { value: "assignment", label: "Assignment" },
  { value: "project", label: "Project" },
] as const;

export function useMyRoles() {
  return useQuery({
    queryKey: ["me", "roles"],
    queryFn: () => apiFetch<string[]>("/me/roles"),
    staleTime: 1000 * 60 * 5,
  });
}

export function useMyPermissions() {
  return useQuery({
    queryKey: ["me", "permissions"],
    queryFn: () => apiFetch<string[]>("/me/permissions"),
    staleTime: 1000 * 60 * 5,
  });
}

export function useTeacherCourses() {
  return useQuery({
    queryKey: ["teacher", "courses"],
    queryFn: () => apiFetch<Course[]>("/courses?owned=true"),
    staleTime: 1000 * 60 * 2,
  });
}

export function useLessonMaterials(lessonId: string | undefined) {
  return useQuery({
    queryKey: ["lessons", lessonId, "materials"],
    queryFn: () => apiFetch<LearningMaterial[]>(`/lessons/${lessonId}/materials`),
    enabled: !!lessonId,
    staleTime: 1000 * 30,
  });
}

export function useMaterialStatus(materialId: string | undefined) {
  return useQuery({
    queryKey: ["materials", materialId, "status"],
    queryFn: () => apiFetch<MaterialStatus>(`/materials/${materialId}/status`),
    enabled: !!materialId,
    refetchInterval: (query) => {
      const status = query.state.data?.processing_status;
      if (status && ["extracting", "chunking", "embedding"].includes(status)) return 3000;
      return false;
    },
  });
}

export function useProcessingSummary(lessonId: string | undefined) {
  return useQuery({
    queryKey: ["lessons", lessonId, "processing-summary"],
    queryFn: () => apiFetch<ProcessingSummary>(`/lessons/${lessonId}/processing-summary`),
    enabled: !!lessonId,
  });
}

export function useCreateCourse() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: {
      organization_id: string;
      slug: string;
      title: string;
      description?: string;
      level?: string;
      estimated_minutes?: number;
    }) => apiPost<Course>("/courses", payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["teacher", "courses"] }),
  });
}

export function useUpdateCourse(courseId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: Partial<Course>) => apiPatch<Course>(`/courses/${courseId}`, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["teacher", "courses"] });
      qc.invalidateQueries({ queryKey: ["courses", courseId] });
    },
  });
}

export function useCreateModule(courseId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: { title: string; description?: string; position: number; status?: string }) =>
      apiPost<CourseContentModule>(`/courses/${courseId}/modules`, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["courses", courseId, "content"] }),
  });
}

export function useUpdateModule(moduleId: string, courseId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: { title?: string; description?: string; position?: number; status?: string; estimated_minutes?: number }) =>
      apiPatch<CourseContentModule>(`/modules/${moduleId}`, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["courses", courseId, "content"] }),
  });
}

export function useCreateLesson(moduleId: string, courseId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: {
      slug: string;
      title: string;
      summary?: string;
      lesson_type?: string;
      estimated_minutes?: number;
      status?: string;
    }) => apiPost<CourseContentLesson>(`/modules/${moduleId}/lessons`, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["courses", courseId, "content"] }),
  });
}

export function useUpdateLesson(lessonId: string, courseId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: {
      title?: string;
      summary?: string;
      lesson_type?: string;
      status?: string;
      estimated_minutes?: number;
      notes_markdown?: string;
    }) => apiPatch<CourseContentLesson>(`/lessons/${lessonId}`, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["courses", courseId, "content"] }),
  });
}

export function useRequestUploadUrl() {
  return useMutation({
    mutationFn: (payload: {
      original_filename: string;
      mime_type: string;
      size_bytes?: number;
    }) => apiPost<UploadUrlResponse>("/materials/upload-url", payload),
  });
}

export function useCreateMaterial(courseId: string, moduleId: string, lessonId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: {
      title: string;
      material_type: string;
      storage_object_id?: string;
      ai_processing_enabled?: boolean;
      visible_to_students?: boolean;
    }) =>
      apiPost<LearningMaterial>(
        `/courses/${courseId}/modules/${moduleId}/lessons/${lessonId}/materials`,
        payload,
      ),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["lessons", lessonId, "materials"] }),
  });
}

export function useReprocessMaterial(lessonId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (materialId: string) => apiPost<MaterialStatus>(`/materials/${materialId}/reprocess`),
    onSuccess: (_, materialId) => {
      qc.invalidateQueries({ queryKey: ["materials", materialId, "status"] });
      qc.invalidateQueries({ queryKey: ["lessons", lessonId, "processing-summary"] });
    },
  });
}

export function useAddModuleItem(moduleId: string, courseId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: {
      item_type: string;
      lesson_id?: string;
      quiz_id?: string;
      interview_config_id?: string;
      position: number;
    }) => apiPost(`/modules/${moduleId}/items`, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["courses", courseId, "content"] }),
  });
}
