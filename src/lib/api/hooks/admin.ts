import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch, apiPatch } from "../client";
import type { CourseEnrollmentRead } from "../types/teacher";

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

export function useUpdateEnrollment(enrollmentId: string, courseId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: { status?: string; completed_at?: string; dropped_at?: string }) =>
      apiPatch<CourseEnrollmentRead>(`/teacher/course-enrollments/${enrollmentId}`, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["teacher", "courses", courseId, "roster"] }),
  });
}
