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
  CourseEnrollmentRead,
  CourseRoster,
  LearningMaterial,
  LessonRead,
  MaterialStatus,
  ProcessingSummary,
  UploadUrlResponse,
} from "../types/teacher";

type CourseUpdatePayload = Partial<Omit<Course, "status">> & { status?: string };

export function useMe() {
  return useQuery({
    queryKey: ["me"],
    queryFn: () => apiFetch<{ id: string; primary_email: string }>("/me"),
    staleTime: 1000 * 60 * 5,
  });
}

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

export function useTeacherLessonMaterials(lessonId: string | undefined) {
  return useQuery({
    queryKey: ["teacher", "lessons", lessonId, "materials"],
    queryFn: () => apiFetch<LearningMaterial[]>(`/lessons/${lessonId}/materials`),
    enabled: !!lessonId,
    staleTime: 1000 * 30,
  });
}

export function useTeacherMaterialStatus(materialId: string | undefined) {
  return useQuery({
    queryKey: ["teacher", "materials", materialId, "status"],
    queryFn: () => apiFetch<MaterialStatus>(`/materials/${materialId}/status`),
    enabled: !!materialId,
    refetchInterval: (query) => {
      const status = query.state.data?.processing_status;
      if (status && ["extracting", "chunking", "embedding"].includes(status)) return 3000;
      return false;
    },
  });
}

export function useTeacherProcessingSummary(lessonId: string | undefined) {
  return useQuery({
    queryKey: ["teacher", "lessons", lessonId, "processing-summary"],
    queryFn: () => apiFetch<ProcessingSummary>(`/lessons/${lessonId}/processing-summary`),
    enabled: !!lessonId,
  });
}

export function useTeacherMaterialStreamUrl(materialId: string | null | undefined) {
  return useQuery({
    queryKey: ["teacher", "materials", materialId, "stream-url"],
    queryFn: () => apiFetch<StreamUrlResponse>(`/materials/${materialId}/stream-url`),
    enabled: !!materialId,
    staleTime: 1000 * 60 * 4,
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
    mutationFn: (payload: CourseUpdatePayload) => apiPatch<Course>(`/teacher/courses/${courseId}`, payload),
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

export function useTeacherRequestUploadUrl() {
  return useMutation({
    mutationFn: (payload: { original_filename: string; mime_type: string; size_bytes?: number }) =>
      apiPost<UploadUrlResponse>("/materials/upload-url", payload),
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
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["teacher", "lessons", lessonId, "materials"] });
    },
  });
}

export function useDeleteMaterial(lessonId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (materialId: string) => apiDelete(`/materials/${materialId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["teacher", "lessons", lessonId, "materials"] });
      qc.invalidateQueries({ queryKey: ["teacher", "lessons", lessonId, "processing-summary"] });
    },
  });
}

export function useUpdateMaterial(lessonId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ materialId, payload }: {
      materialId: string;
      payload: { ai_processing_enabled?: boolean; visible_to_students?: boolean; title?: string };
    }) => apiPatch<LearningMaterial>(`/materials/${materialId}`, payload),
    onSuccess: (_, { materialId }) => {
      qc.invalidateQueries({ queryKey: ["teacher", "lessons", lessonId, "materials"] });
      qc.invalidateQueries({ queryKey: ["teacher", "materials", materialId, "status"] });
    },
  });
}

export function useReprocessMaterial(lessonId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (materialId: string) => apiPost<MaterialStatus>(`/materials/${materialId}/reprocess`),
    onSuccess: (_, materialId) => {
      qc.invalidateQueries({ queryKey: ["teacher", "materials", materialId, "status"] });
      qc.invalidateQueries({ queryKey: ["teacher", "lessons", lessonId, "processing-summary"] });
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

export function useUpdateEnrollment(enrollmentId: string, courseId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: { status?: string; completed_at?: string; dropped_at?: string }) =>
      apiPatch<CourseEnrollmentRead>(`/teacher/course-enrollments/${enrollmentId}`, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["teacher", "courses", courseId, "roster"] }),
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
