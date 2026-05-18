import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch, apiPost } from "../client";
import { queryKeys } from "../query-keys";
import type {
  GapReportRead,
  InterviewConfigPublic,
  InterviewForTakingPublic,
  InterviewSessionFinishResponse,
  InterviewSessionPublic,
  InterviewSessionStartRequest,
  InterviewSessionStartResponse,
  InterviewSubmitAnswerRequest,
  InterviewSubmitAnswerResponse,
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

export function useInterviewSession(sessionId: string | null | undefined) {
  return useQuery({
    queryKey: queryKeys.interviews.session(sessionId ?? ""),
    queryFn: () =>
      apiFetch<InterviewSessionPublic>(`/interview-sessions/${sessionId}`),
    enabled: !!sessionId,
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

export type {
  InterviewForTakingPublic,
};
