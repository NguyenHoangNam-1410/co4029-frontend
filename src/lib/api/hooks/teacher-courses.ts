import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiDelete, apiFetch, apiPatch, apiPost, apiPut } from "../client";
import type {
  Course,
  CourseContent,
  CourseContentItem,
  CourseContentLesson,
  CourseContentModule,
  CourseDetail,
  LessonResource,
  StreamUrlResponse,
} from "../types/common";
import type {
  CourseRoster,
  LessonOutlineRead,
  LessonRead,
} from "../types/teacher";

type CourseUpdatePayload = Partial<Omit<Course, "status">> & { status?: string };

export function useTeacherCourses() {
  return useQuery({
    queryKey: ["teacher", "courses"],
    queryFn: () => apiFetch<Course[]>("/teacher/courses"),
    staleTime: 1000 * 60 * 2,
  });
}

export function useTeacherCourseById(courseId: string | undefined) {
  return useQuery({
    queryKey: ["teacher", "courses", courseId],
    queryFn: () => apiFetch<CourseDetail>(`/teacher/courses/${courseId}`),
    enabled: !!courseId,
    staleTime: 1000 * 60 * 5,
  });
}

export function useTeacherCourseContent(courseId: string | undefined) {
  return useQuery({
    queryKey: ["teacher", "courses", courseId, "content"],
    queryFn: () => apiFetch<CourseContent>(`/teacher/courses/${courseId}/content`),
    enabled: !!courseId,
    staleTime: 1000 * 60 * 10,
  });
}

export function useTeacherLesson(lessonId: string | undefined) {
  return useQuery({
    queryKey: ["teacher", "lessons", lessonId],
    queryFn: () => apiFetch<LessonRead>(`/teacher/lessons/${lessonId}`),
    enabled: !!lessonId,
    staleTime: 1000 * 60 * 5,
  });
}

/**
 * Outline preview for a lesson (Quiz Quality + Coverage Mode spec FR-4).
 *
 * Returns the lesson's section structure derived at request time from the
 * indexed chunks. Use this before calling `useGenerateQuiz` so the teacher
 * can pick `coverage_options.section_ids`, see `suggested_question_count`,
 * and decide between `generation_mode: "topic"` vs `"coverage"`.
 *
 * Cached for 5 minutes — the outline only changes when material is
 * re-ingested, so longer staleTime is fine.
 */
export function useLessonOutline(lessonId: string | undefined) {
  return useQuery({
    queryKey: ["teacher", "lessons", lessonId, "outline"],
    queryFn: () => apiFetch<LessonOutlineRead>(`/lessons/${lessonId}/outline`),
    enabled: !!lessonId,
    staleTime: 1000 * 60 * 5,
  });
}

export function useTeacherLessonResources(lessonId: string | undefined) {
  return useQuery({
    queryKey: ["teacher", "lessons", lessonId, "resources"],
    queryFn: () => apiFetch<LessonResource[]>(`/teacher/lessons/${lessonId}/resources`),
    enabled: !!lessonId,
    staleTime: 1000 * 60 * 5,
  });
}

export function useTeacherCourseRoster(courseId: string | undefined) {
  return useQuery({
    queryKey: ["teacher", "courses", courseId, "roster"],
    queryFn: () => apiFetch<CourseRoster>(`/teacher/courses/${courseId}/roster`),
    enabled: !!courseId,
    staleTime: 1000 * 60 * 2,
  });
}

export async function fetchTeacherResourceDownloadUrl(resourceId: string): Promise<string> {
  const data = await apiFetch<StreamUrlResponse>(`/teacher/lesson-resources/${resourceId}/download-url`);
  return data.stream_url;
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
    }) => apiPost<Course>("/teacher/courses", payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["teacher", "courses"] }),
  });
}

export function useUpdateCourse(courseId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CourseUpdatePayload & { slug?: string }) =>
      apiPatch<Course>(`/teacher/courses/${courseId}`, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["teacher", "courses"] });
      qc.invalidateQueries({ queryKey: ["teacher", "courses", courseId] });
    },
  });
}

export function useCreateModule(courseId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: { title: string; description?: string; position: number; status?: string }) =>
      apiPost<CourseContentModule>(`/teacher/courses/${courseId}/modules`, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["teacher", "courses", courseId, "content"] }),
  });
}

export function useUpdateModule(moduleId: string, courseId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: {
      title?: string;
      description?: string;
      position?: number;
      status?: string;
      estimated_minutes?: number;
    }) => apiPatch<CourseContentModule>(`/teacher/modules/${moduleId}`, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["teacher", "courses", courseId, "content"] }),
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
    }) => apiPost<CourseContentLesson>(`/teacher/modules/${moduleId}/lessons`, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["teacher", "courses", courseId, "content"] }),
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
      difficulty?: string;
      estimated_minutes?: number;
      notes_markdown?: string;
      primary_material_id?: string | null;
    }) => apiPatch<LessonRead>(`/teacher/lessons/${lessonId}`, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["teacher", "courses", courseId, "content"] });
      qc.invalidateQueries({ queryKey: ["teacher", "lessons", lessonId] });
    },
  });
}

export function useCreateLessonResource(lessonId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: {
      title: string;
      resource_type: string;
      storage_object_id?: string;
      position: number;
      visible_to_students?: boolean;
    }) => apiPost<LessonResource>(`/teacher/lessons/${lessonId}/resources`, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["teacher", "lessons", lessonId, "resources"] }),
  });
}

export function useDeleteLessonResource(lessonId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (resourceId: string) => apiDelete(`/teacher/lesson-resources/${resourceId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["teacher", "lessons", lessonId, "resources"] }),
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
    }) => apiPost(`/teacher/modules/${moduleId}/items`, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["teacher", "courses", courseId, "content"] }),
  });
}

export function useReorderModuleItems(moduleId: string, courseId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (itemIds: string[]) =>
      apiPut<CourseContentItem[]>(`/teacher/modules/${moduleId}/items/reorder`, { item_ids: itemIds }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["teacher", "courses", courseId, "content"] }),
  });
}

export function useDeleteModuleItem(courseId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (itemId: string) => apiDelete(`/teacher/module-items/${itemId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["teacher", "courses", courseId, "content"] }),
  });
}

export function useUpdateModuleItem(courseId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ itemId, payload }: { itemId: string; payload: { unlock_rule_json?: Record<string, unknown> } }) =>
      apiPatch(`/teacher/module-items/${itemId}`, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["teacher", "courses", courseId, "content"] }),
  });
}

export function useDeleteLesson(courseId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (lessonId: string) => apiDelete(`/teacher/lessons/${lessonId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["teacher", "courses", courseId, "content"] }),
  });
}
