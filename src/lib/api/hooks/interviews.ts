import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiDelete, apiFetch, apiPatch, apiPost } from "../client";
import { queryKeys } from "../query-keys";
import type {
  GapReportAuthoringRead,
  GapReportRead,
  IntegrityEventsRequest,
  IntegrityEventsResponse,
  InterviewConfigAuthoring,
  InterviewConfigCreate,
  InterviewConfigPublic,
  InterviewConfigUpdate,
  InterviewForAuthoringPublic,
  InterviewForTakingPublic,
  InterviewGenerationRequest,
  InterviewGenerationRunPublic,
  InterviewSessionFinishResponse,
  InterviewSessionPublic,
  InterviewSessionStartRequest,
  InterviewSessionStartResponse,
  InterviewSubmitAnswerRequest,
  InterviewSubmitAnswerResponse,
  RealtimeTokenResponse,
} from "../types";

export function useInterviewForTaking(configId: string | null | undefined) {
  return useQuery({
    queryKey: queryKeys.interviews.detail(configId ?? ""),
    queryFn: () =>
      apiFetch<InterviewConfigPublic>(`/interview-configs/${configId}`),
    enabled: !!configId,
  });
}

export function useStartInterviewSession(configId: string | null | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: InterviewSessionStartRequest) =>
      apiPost<InterviewSessionStartResponse>(
        `/interview-configs/${configId}/sessions`,
        body,
      ),
    onSuccess: () => {
      void qc.invalidateQueries({
        queryKey: queryKeys.interviews.mySessions(),
      });
    },
  });
}

export function useInterviewSession(
  sessionId: string | null | undefined,
  options?: { refetchInterval?: number },
) {
  return useQuery({
    queryKey: queryKeys.interviews.session(sessionId ?? ""),
    queryFn: () =>
      apiFetch<InterviewSessionPublic>(`/interview-sessions/${sessionId}`),
    enabled: !!sessionId,
    // Used by the voice-completion flow to poll until the server marks the
    // session terminal (TanStack Query does NOT poll by default).
    refetchInterval: options?.refetchInterval,
  });
}

export function useInterviewRespond(sessionId: string | null | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: InterviewSubmitAnswerRequest) =>
      apiPost<InterviewSubmitAnswerResponse>(
        `/interview-sessions/${sessionId}/respond`,
        body,
      ),
    onSuccess: () => {
      if (sessionId) {
        void qc.invalidateQueries({
          queryKey: queryKeys.interviews.session(sessionId),
        });
      }
    },
  });
}

export function useFinishInterview(sessionId: string | null | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () =>
      apiPost<InterviewSessionFinishResponse>(
        `/interview-sessions/${sessionId}/finish`,
      ),
    onSuccess: () => {
      if (sessionId) {
        void qc.invalidateQueries({
          queryKey: queryKeys.interviews.session(sessionId),
        });
        void qc.invalidateQueries({
          queryKey: queryKeys.interviews.gapReport(sessionId),
        });
      }
      void qc.invalidateQueries({
        queryKey: queryKeys.interviews.mySessions(),
      });
    },
  });
}

export function useGapReport(sessionId: string | null | undefined) {
  return useQuery({
    queryKey: queryKeys.interviews.gapReport(sessionId ?? ""),
    queryFn: () =>
      apiFetch<GapReportRead>(`/interview-sessions/${sessionId}/gap-report`),
    enabled: !!sessionId,
  });
}

export function useMyInterviewSessions() {
  return useQuery({
    queryKey: queryKeys.interviews.mySessions(),
    queryFn: () =>
      apiFetch<InterviewSessionPublic[]>(`/me/interview-sessions`),
  });
}

/* ───────────────── Teacher-side (W5.4) ───────────────── */

export function useInterviewForAuthoring(configId: string | null | undefined) {
  return useQuery({
    queryKey: queryKeys.interviews.configAuthoring(configId ?? ""),
    queryFn: () =>
      apiFetch<InterviewForAuthoringPublic>(
        `/teacher/interview-configs/${configId}`,
      ),
    enabled: !!configId,
  });
}

/**
 * POST /teacher/courses/{course_id}/interview-configs — create a draft config.
 */
export function useCreateInterviewConfig(courseId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: InterviewConfigCreate) =>
      apiPost<InterviewConfigAuthoring>(
        `/teacher/courses/${courseId}/interview-configs`,
        payload,
      ),
    onSuccess: (config) => {
      void qc.invalidateQueries({
        queryKey: queryKeys.interviews.configAuthoring(config.id),
      });
      if (courseId) {
        void qc.invalidateQueries({
          queryKey: ["teacher", "courses", courseId, "content"],
        });
      }
    },
  });
}

/**
 * GET /teacher/interview-configs/{config_id} — authoring projection (full schema,
 * status widened to draft|published|archived).
 * @deprecated Use useInterviewForAuthoring instead for access to questions & outcomes.
 */
export function useInterviewConfig(configId: string | null | undefined) {
  return useQuery({
    queryKey: queryKeys.interviews.configAuthoring(configId ?? ""),
    queryFn: () =>
      apiFetch<InterviewConfigAuthoring>(
        `/teacher/interview-configs/${configId}`,
      ),
    enabled: !!configId,
  });
}

/**
 * PATCH /teacher/interview-configs/{config_id} — partial update (title, persona,
 * supported_modes, max_attempts, lock_quiz_ef_until_pass, etc.).
 */
export function useUpdateInterviewConfig(configId: string | null | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: InterviewConfigUpdate) =>
      apiPatch<InterviewConfigAuthoring>(
        `/teacher/interview-configs/${configId}`,
        payload,
      ),
    onSuccess: (config) => {
      void qc.invalidateQueries({
        queryKey: queryKeys.interviews.configAuthoring(config.id),
      });
      void qc.invalidateQueries({
        queryKey: ["teacher", "courses", config.course_id, "content"],
      });
    },
  });
}

/**
 * POST /teacher/interview-configs/{config_id}/publish — flip status to published.
 *
 * Backend rejects publish when there are no approved questions; the route
 * surfaces the Vietnamese microcopy "Tạo câu hỏi trước khi xuất bản" on 4xx.
 */
export function usePublishInterviewConfig(configId: string | null | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () =>
      apiPost<InterviewConfigAuthoring>(
        `/teacher/interview-configs/${configId}/publish`,
      ),
    onSuccess: (config) => {
      void qc.invalidateQueries({
        queryKey: queryKeys.interviews.configAuthoring(config.id),
      });
      void qc.invalidateQueries({
        queryKey: ["teacher", "courses", config.course_id, "content"],
      });
    },
  });
}

/**
 * DELETE /teacher/interview-configs/{config_id} — soft-delete.
 */
export function useDeleteInterviewConfig(configId: string | null | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () =>
      apiDelete(`/teacher/interview-configs/${configId}`),
    onSuccess: () => {
      if (configId) {
        qc.removeQueries({
          queryKey: queryKeys.interviews.configAuthoring(configId),
        });
      }
    },
  });
}

/**
 * POST /teacher/interview-configs/{config_id}/generate — kick off an
 * `InterviewGenerationRun`. Returns the run object; poll
 * `useInterviewGenerationRun` until status is completed/failed/cancelled.
 */
export function useGenerateInterviewQuestions(
  configId: string | null | undefined,
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: InterviewGenerationRequest) =>
      apiPost<InterviewGenerationRunPublic>(
        `/teacher/interview-configs/${configId}/generate`,
        payload,
      ),
    onSuccess: (run) => {
      if (configId) {
        void qc.invalidateQueries({
          queryKey: queryKeys.interviews.generationRun(configId, run.run_id),
        });
        void qc.invalidateQueries({
          queryKey: queryKeys.interviews.configAuthoring(configId),
        });
      }
    },
  });
}

/**
 * GET /teacher/interview-configs/{config_id}/generation-runs/{run_id} —
 * status-poll companion to `useGenerateInterviewQuestions`. Polls every 2.5s
 * while the run is pending or running, mirroring the W0.10 quiz pattern.
 */
export function useInterviewGenerationRun(
  configId: string | null | undefined,
  runId: string | null | undefined,
) {
  return useQuery({
    queryKey: queryKeys.interviews.generationRun(
      configId ?? "",
      runId ?? "",
    ),
    queryFn: () =>
      apiFetch<InterviewGenerationRunPublic>(
        `/teacher/interview-configs/${configId}/generation-runs/${runId}`,
      ),
    enabled: !!configId && !!runId,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      if (status === "pending" || status === "running") return 2500;
      return false;
    },
  });
}

/**
 * GET /teacher/interview-sessions/{session_id}/gap-report — teacher-facing
 * projection (re-introduces raw_evaluation_json, teacher_summary, source links).
 */
export function useTeacherGapReport(sessionId: string | null | undefined) {
  return useQuery({
    queryKey: queryKeys.interviews.teacherGapReport(sessionId ?? ""),
    queryFn: () =>
      apiFetch<GapReportAuthoringRead>(
        `/teacher/interview-sessions/${sessionId}/gap-report`,
      ),
    enabled: !!sessionId,
  });
}

/**
 * GET /interview-sessions/{session_id} — read-only session detail.
 *
 * The backend only exposes a single session-detail endpoint; the teacher view
 * reuses it (subject to course-scope auth on the server). Surfaced under a
 * separate query key so teacher invalidations don't churn learner caches.
 */
export function useTeacherInterviewSession(
  sessionId: string | null | undefined,
) {
  return useQuery({
    queryKey: queryKeys.interviews.teacherSession(sessionId ?? ""),
    queryFn: () =>
      apiFetch<InterviewSessionPublic>(
        `/interview-sessions/${sessionId}`,
      ),
    enabled: !!sessionId,
  });
}

/**
 * POST /interview-sessions/{session_id}/realtime-token
 * Fetches a short-lived LiveKit participant token for voice mode.
 * Errors: 503 voice disabled, 409 wrong mode/status, 403/404 ownership/missing.
 */
export function useInterviewRealtimeToken(sessionId: string | null | undefined) {
  return useMutation({
    mutationFn: () =>
      apiPost<RealtimeTokenResponse>(
        `/interview-sessions/${sessionId}/realtime-token`,
      ),
  });
}

/**
 * POST /interview-sessions/{session_id}/integrity-events
 * Batch-posts proctoring/integrity signals. Max 50 events per call.
 * Never throws into the UI — errors are silently swallowed at the call site.
 */
export function useReportIntegrityEvents(sessionId: string | null | undefined) {
  return useMutation({
    mutationFn: (body: IntegrityEventsRequest) =>
      apiPost<IntegrityEventsResponse>(
        `/interview-sessions/${sessionId}/integrity-events`,
        body,
      ),
  });
}

export type {
  InterviewForTakingPublic,
};
