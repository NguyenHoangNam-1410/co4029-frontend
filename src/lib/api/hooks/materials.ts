import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiDelete, apiFetch, apiPatch, apiPost, ApiError } from "../client";
import { authenticatedFetch } from "../../auth";
import { queryKeys } from "../query-keys";
import type {
  ChunkPreview,
  MaterialPublic,
  MaterialStreamUrl,
  MaterialUpdate,
  MaterialUploadComplete,
  MaterialUploadInit,
  MaterialUploadInitOut,
  MaterialAuthoring,
  MultipartAbortIn,
  MultipartCompleteIn,
  MultipartPartsOut,
  ReprocessOut,
  UploadCompleteOut,
} from "../types";
import type { StreamUrlResponse } from "../types/common";
import type {
  LearningMaterial,
  MaterialStatus,
  ProcessingSummary,
  UploadUrlResponse,
} from "../types/teacher";

function retryUnless404(failureCount: number, error: unknown) {
  if (error instanceof ApiError && error.status === 404) return false;
  return failureCount < 3;
}

export function useMaterial(materialId: string | null | undefined) {
  return useQuery({
    queryKey: queryKeys.materials.detail(materialId ?? ""),
    queryFn: () => apiFetch<MaterialPublic>(`/materials/${materialId}`),
    enabled: !!materialId,
    staleTime: 5 * 60_000,
    retry: retryUnless404,
  });
}

export function useStreamUrl(materialId: string | null | undefined) {
  return useQuery({
    queryKey: queryKeys.materials.streamUrl(materialId ?? ""),
    queryFn: () =>
      apiFetch<MaterialStreamUrl>(`/materials/${materialId}/stream-url`),
    enabled: !!materialId,
    staleTime: 30 * 60_000,
    refetchInterval: 30 * 60_000,
    retry: retryUnless404,
  });
}

export const useMaterialStreamUrl = useStreamUrl;

export function useChunksPreview(
  materialId: string | null | undefined,
  limit?: number,
) {
  const clampedLimit =
    limit !== undefined ? Math.max(1, Math.min(20, limit)) : undefined;
  const qs = clampedLimit !== undefined ? `?limit=${clampedLimit}` : "";

  return useQuery({
    queryKey: queryKeys.materials.chunksPreview(materialId ?? "", clampedLimit),
    queryFn: () =>
      apiFetch<ChunkPreview[]>(
        `/materials/${materialId}/chunks/preview${qs}`,
      ),
    enabled: !!materialId,
    staleTime: 5 * 60_000,
    retry: retryUnless404,
  });
}

export function useTeacherLessonMaterials(lessonId: string | undefined) {
  return useQuery({
    queryKey: ["teacher", "lessons", lessonId, "materials"],
    queryFn: () => apiFetch<LearningMaterial[]>(`/teacher/lessons/${lessonId}/materials`),
    enabled: !!lessonId,
    staleTime: 1000 * 30,
  });
}

export function useTeacherMaterialStatus(materialId: string | undefined) {
  return useQuery({
    queryKey: ["teacher", "materials", materialId, "status"],
    queryFn: () => apiFetch<MaterialStatus>(`/teacher/materials/${materialId}/processing-summary`),
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
    queryFn: () => apiFetch<ProcessingSummary>(`/teacher/lessons/${lessonId}/processing-summary`),
    enabled: !!lessonId,
  });
}

export function useTeacherMaterialStreamUrl(materialId: string | null | undefined) {
  return useQuery({
    queryKey: ["teacher", "materials", materialId, "stream-url"],
    queryFn: () => apiFetch<StreamUrlResponse>(`/teacher/materials/${materialId}/stream-url`),
    enabled: !!materialId,
    staleTime: 1000 * 60 * 4,
  });
}

/**
 * @deprecated Legacy `/materials/upload-url` flow — no longer exists in
 * backend-new. Use `useInitMaterialUpload` + `useCompleteMaterialUpload`
 * for materials. Lesson-resource uploads still depend on this hook until
 * W4.4 migrates them; do not delete until then.
 */
export function useTeacherRequestUploadUrl() {
  return useMutation({
    mutationFn: (payload: { original_filename: string; mime_type: string; size_bytes?: number }) =>
      apiPost<UploadUrlResponse>("/materials/upload-url", payload),
  });
}

/**
 * @deprecated Legacy `POST /courses/.../materials` — replaced by the
 * direct-upload flow (`useInitMaterialUpload` + `useCompleteMaterialUpload`).
 * Retained only while lesson-resource uploads still create a sibling
 * material via this hook; W4.4 will remove it.
 */
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

export function useInitMaterialUpload(lessonId: string) {
  return useMutation({
    mutationFn: (payload: MaterialUploadInit) =>
      apiPost<MaterialUploadInitOut>(
        `/teacher/lessons/${lessonId}/materials/init-upload`,
        payload,
      ),
  });
}

export function useCompleteMaterialUpload() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      materialId,
      versionId,
      payload,
    }: {
      materialId: string;
      versionId: string;
      payload: MaterialUploadComplete;
    }) =>
      apiPost<UploadCompleteOut>(
        `/teacher/materials/${materialId}/versions/${versionId}/complete`,
        payload,
      ),
    onSuccess: (_data, { materialId }) => {
      qc.invalidateQueries({ queryKey: queryKeys.materials.detail(materialId) });
      qc.invalidateQueries({ queryKey: ["teacher", "lessons"] });
      qc.invalidateQueries({ queryKey: ["teacher", "materials", materialId] });
    },
  });
}

export function useFetchMultipartParts() {
  return useMutation({
    mutationFn: ({
      materialId,
      versionId,
      uploadId,
      from,
      count,
    }: {
      materialId: string;
      versionId: string;
      uploadId: string;
      from?: number;
      count?: number;
    }) => {
      const params = new URLSearchParams({ upload_id: uploadId });
      if (from !== undefined) params.set("from", String(from));
      if (count !== undefined) params.set("count", String(count));
      return apiPost<MultipartPartsOut>(
        `/teacher/materials/${materialId}/versions/${versionId}/multipart/parts?${params.toString()}`,
      );
    },
  });
}

export function useCompleteMultipartUpload() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      materialId,
      versionId,
      payload,
    }: {
      materialId: string;
      versionId: string;
      payload: MultipartCompleteIn;
    }) => {
      const res = await authenticatedFetch(
        `/teacher/materials/${materialId}/versions/${versionId}/multipart/complete`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      if (!res.ok && res.status !== 204) {
        const body = await res.text().catch(() => "");
        throw new ApiError(res.status, body, res.statusText);
      }
    },
    onSuccess: (_data, { materialId }) => {
      qc.invalidateQueries({ queryKey: queryKeys.materials.detail(materialId) });
      qc.invalidateQueries({ queryKey: ["teacher", "lessons"] });
      qc.invalidateQueries({ queryKey: ["teacher", "materials", materialId] });
    },
  });
}

export function useAbortMultipartUpload() {
  return useMutation({
    mutationFn: async ({
      materialId,
      versionId,
      payload,
    }: {
      materialId: string;
      versionId: string;
      payload: MultipartAbortIn;
    }) => {
      const res = await authenticatedFetch(
        `/teacher/materials/${materialId}/versions/${versionId}/multipart/abort`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      if (!res.ok && res.status !== 204) {
        const body = await res.text().catch(() => "");
        throw new ApiError(res.status, body, res.statusText);
      }
    },
  });
}

export function useReprocessMaterial(materialId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () =>
      apiPost<ReprocessOut>(`/teacher/materials/${materialId}/reprocess`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.materials.detail(materialId) });
      qc.invalidateQueries({ queryKey: queryKeys.materials.processing(materialId) });
      qc.invalidateQueries({ queryKey: ["teacher", "lessons"] });
      qc.invalidateQueries({ queryKey: ["teacher", "materials", materialId] });
    },
  });
}

export function useUpdateMaterial(materialId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: MaterialUpdate) =>
      apiPatch<MaterialAuthoring>(`/teacher/materials/${materialId}`, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.materials.detail(materialId) });
      qc.invalidateQueries({ queryKey: ["teacher", "lessons"] });
      qc.invalidateQueries({ queryKey: ["teacher", "materials", materialId] });
    },
  });
}

export function useDeleteMaterial(materialId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => apiDelete(`/teacher/materials/${materialId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.materials.detail(materialId) });
      qc.invalidateQueries({ queryKey: ["teacher", "lessons"] });
      qc.invalidateQueries({ queryKey: ["teacher", "materials", materialId] });
    },
  });
}
