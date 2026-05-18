import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiDelete, apiFetch, apiPatch, apiPost } from "../client";
import type { StreamUrlResponse } from "../types/common";
import type {
  LearningMaterial,
  MaterialStatus,
  ProcessingSummary,
  UploadUrlResponse,
} from "../types/teacher";

export function useMaterialStreamUrl(materialId: string | null | undefined) {
  return useQuery({
    queryKey: ["materials", materialId, "stream-url"],
    queryFn: () => apiFetch<StreamUrlResponse>(`/materials/${materialId}/stream-url`),
    enabled: !!materialId,
    staleTime: 1000 * 60 * 4,
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
      if (status && ["pending", "extracting", "chunking", "embedding", "building_kg"].includes(status)) return 3000;
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
