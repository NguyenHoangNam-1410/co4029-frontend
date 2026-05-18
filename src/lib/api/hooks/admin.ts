import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch, apiPatch } from "../client";
import { queryKeys } from "../query-keys";
import { useInfinitePage } from "../use-infinite-page";
import type {
  ActiveUsersOut,
  ContentOut,
  HealthOut,
  OverviewOut,
  User,
  UserListPage,
} from "../types";
import type { CourseEnrollmentRead } from "../types/teacher";

export function useMyRoles() {
  return useQuery({
    queryKey: ["me", "roles"],
    queryFn: () => apiFetch<string[]>("/me/roles"),
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

export function useAdminStatsOverview() {
  return useQuery({
    queryKey: queryKeys.admin.statsOverview(),
    queryFn: () => apiFetch<OverviewOut>("/admin/stats/overview"),
    staleTime: 1000 * 60,
  });
}

export function useActiveUsersStats() {
  return useQuery({
    queryKey: queryKeys.admin.activeUsers(),
    queryFn: () => apiFetch<ActiveUsersOut>("/admin/stats/active-users"),
    staleTime: 1000 * 60,
  });
}

export function useContentStats() {
  return useQuery({
    queryKey: queryKeys.admin.content(),
    queryFn: () => apiFetch<ContentOut>("/admin/stats/content"),
    staleTime: 1000 * 60,
  });
}

export function useStatsHealth(since: string) {
  return useQuery({
    queryKey: queryKeys.admin.statsHealth(since),
    queryFn: () =>
      apiFetch<HealthOut>(
        `/admin/stats/health?since=${encodeURIComponent(since)}`,
      ),
    staleTime: 1000 * 30,
    enabled: Boolean(since),
  });
}

export function useUsersList(limit = 20) {
  return useInfinitePage<User>({
    queryKey: queryKeys.admin.users(),
    fetch: async (cursor, lim = limit) => {
      const params = new URLSearchParams();
      if (cursor) params.set("cursor", cursor);
      if (lim) params.set("limit", String(lim));
      const qs = params.toString();
      const page = await apiFetch<UserListPage>(qs ? `/users?${qs}` : "/users");
      return { items: page.items, next_cursor: page.next_cursor ?? null };
    },
    limit,
  });
}

export function useUserDetail(userId: string) {
  return useQuery({
    queryKey: queryKeys.admin.userDetail(userId),
    queryFn: () => apiFetch<User>(`/users/${userId}`),
    enabled: Boolean(userId),
  });
}
