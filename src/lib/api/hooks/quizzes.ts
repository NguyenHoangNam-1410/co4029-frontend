import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiDelete, apiFetch, apiPatch, apiPost } from "../client";
import { queryKeys } from "../query-keys";
import type {
  QuizAttemptRead,
  QuizAttemptStart,
  QuizAttemptSubmitAnswer,
  QuizAttemptAnswerRead,
  QuizForTakingPublic,
  QuizPublic,
} from "../types";
import type {
  GenerationRun,
  QuizCreatePayload,
  QuizGeneratePayload,
  QuizQuestionCreatePayload,
  QuizQuestionPatch,
  QuizQuestionRead,
  QuizRead,
} from "../types/teacher";

export function useStudentQuiz(quizId: string | null | undefined) {
  return useQuery({
    queryKey: queryKeys.quizzes.detail(quizId ?? ""),
    queryFn: () => apiFetch<QuizPublic>(`/quizzes/${quizId}`),
    enabled: !!quizId,
  });
}

export function useStartQuizAttempt(quizId: string | null | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body?: Partial<QuizAttemptStart>) =>
      apiPost<QuizForTakingPublic>(`/quizzes/${quizId}/attempts`, {
        quiz_id: quizId ?? "",
        ...body,
      }),
    onSuccess: () => {
      if (quizId) {
        void qc.invalidateQueries({
          queryKey: queryKeys.quizzes.myAttempts(quizId),
        });
      }
    },
  });
}

/**
 * POST /attempts/{attempt_id}/answers — record one answer.
 *
 * The hook does NOT toast on 429 `card_cooldown_active`; the caller is
 * expected to inspect `ApiError.code` and surface a per-question cooldown
 * UI (see `useCardCooldown`).
 */
export function useSubmitQuizAnswer(attemptId: string | null | undefined) {
  return useMutation({
    mutationFn: (payload: QuizAttemptSubmitAnswer) =>
      apiPost<QuizAttemptAnswerRead>(
        `/attempts/${attemptId}/answers`,
        payload,
      ),
  });
}

export function useSubmitQuizAttempt(attemptId: string | null | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () =>
      apiPost<QuizAttemptRead>(`/attempts/${attemptId}/submit`),
    onSuccess: (attempt) => {
      void qc.invalidateQueries({
        queryKey: queryKeys.quizzes.attempt(attempt.id),
      });
      void qc.invalidateQueries({
        queryKey: queryKeys.quizzes.myAttempts(attempt.quiz_id),
      });
    },
  });
}

export function useQuizAttempt(attemptId: string | null | undefined) {
  return useQuery({
    queryKey: queryKeys.quizzes.attempt(attemptId ?? ""),
    queryFn: () => apiFetch<QuizAttemptRead>(`/attempts/${attemptId}`),
    enabled: !!attemptId,
  });
}

export function useMyQuizAttempts(quizId: string | null | undefined) {
  return useQuery({
    queryKey: queryKeys.quizzes.myAttempts(quizId ?? ""),
    queryFn: () =>
      apiFetch<QuizAttemptRead[]>(`/me/quizzes/${quizId}/attempts`),
    enabled: !!quizId,
  });
}

export function useGenerateQuiz(moduleId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: QuizGeneratePayload) =>
      apiPost<GenerationRun>(`/modules/${moduleId}/quizzes/generate`, payload),
    onSuccess: (run) => {
      qc.invalidateQueries({ queryKey: ["teacher", "generation-runs", run.id] });
      if (moduleId) qc.invalidateQueries({ queryKey: ["teacher", "modules", moduleId, "quizzes"] });
      if (run.course_id) qc.invalidateQueries({ queryKey: ["teacher", "courses", run.course_id, "content"] });
    },
  });
}

export function useCreateQuiz(moduleId: string | undefined, courseId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: QuizCreatePayload) => apiPost<QuizRead>(`/modules/${moduleId}/quizzes`, payload),
    onSuccess: (quiz) => {
      qc.invalidateQueries({ queryKey: ["teacher", "quizzes", quiz.id] });
      if (courseId) qc.invalidateQueries({ queryKey: ["teacher", "courses", courseId, "content"] });
    },
  });
}

export function useGenerationRun(generationRunId: string | null | undefined) {
  return useQuery({
    queryKey: ["teacher", "generation-runs", generationRunId],
    queryFn: () => apiFetch<GenerationRun>(`/generation-runs/${generationRunId}`),
    enabled: !!generationRunId,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      if (status && ["pending", "running"].includes(status)) return 2500;
      return false;
    },
  });
}

export function useQuiz(quizId: string | null | undefined) {
  return useQuery({
    queryKey: ["teacher", "quizzes", quizId],
    queryFn: () => apiFetch<QuizRead>(`/quizzes/${quizId}`),
    enabled: !!quizId,
  });
}

export function usePatchQuiz(courseId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ quizId, payload }: { quizId: string; payload: Partial<QuizCreatePayload> & { status?: string } }) =>
      apiPatch<QuizRead>(`/quizzes/${quizId}`, payload),
    onSuccess: (quiz) => {
      qc.invalidateQueries({ queryKey: ["teacher", "quizzes", quiz.id] });
      if (courseId) qc.invalidateQueries({ queryKey: ["teacher", "courses", courseId, "content"] });
    },
  });
}

export function useQuizQuestions(quizId: string | null | undefined) {
  return useQuery({
    queryKey: ["teacher", "quizzes", quizId, "questions"],
    queryFn: () => apiFetch<QuizQuestionRead[]>(`/quizzes/${quizId}/questions`),
    enabled: !!quizId,
  });
}

export function useCreateQuizQuestion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ quizId, payload }: { quizId: string; payload: QuizQuestionCreatePayload }) =>
      apiPost<QuizQuestionRead>(`/quizzes/${quizId}/questions`, payload),
    onSuccess: (question) => {
      qc.invalidateQueries({ queryKey: ["teacher", "quizzes", question.quiz_id, "questions"] });
    },
  });
}

export function usePatchQuizQuestion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ questionId, payload }: { questionId: string; payload: QuizQuestionPatch }) =>
      apiPatch<QuizQuestionRead>(`/questions/${questionId}`, payload),
    onSuccess: (question) => {
      qc.invalidateQueries({ queryKey: ["teacher", "quizzes", question.quiz_id, "questions"] });
    },
  });
}

export function useDeleteQuizQuestion(quizId: string | null | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (questionId: string) => apiDelete(`/questions/${questionId}`),
    onSuccess: () => {
      if (quizId) {
        qc.invalidateQueries({ queryKey: ["teacher", "quizzes", quizId, "questions"] });
      }
    },
  });
}

/**
 * Kick off a single-question regenerate (FR-9 of the
 * 2026-05-16-quiz-quality-and-coverage spec).
 *
 * The endpoint returns a `GenerationRun` immediately; the worker rewrites the
 * `QuizQuestion` row in place, so the caller should poll the run with
 * `useGenerationRun` and invalidate the quiz question list once the run
 * completes.
 */
export function useRegenerateQuestion(quizId: string | null | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (questionId: string) =>
      apiPost<GenerationRun>(`/questions/${questionId}/regenerate`),
    onSuccess: (run) => {
      qc.invalidateQueries({ queryKey: ["teacher", "generation-runs", run.id] });
      if (quizId) {
        qc.invalidateQueries({ queryKey: ["teacher", "quizzes", quizId, "questions"] });
      }
    },
  });
}

export function usePublishQuiz() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (quizId: string) => apiPost<QuizRead>(`/quizzes/${quizId}/publish`),
    onSuccess: (quiz) => {
      qc.invalidateQueries({ queryKey: ["teacher", "quizzes", quiz.id] });
      qc.invalidateQueries({ queryKey: ["teacher", "courses", quiz.course_id, "content"] });
    },
  });
}

export function useDeleteQuiz(courseId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (quizId: string) => apiDelete(`/quizzes/${quizId}`),
    onSuccess: (_, quizId) => {
      qc.removeQueries({ queryKey: ["teacher", "quizzes", quizId] });
      qc.removeQueries({ queryKey: ["teacher", "quizzes", quizId, "questions"] });
      if (courseId) {
        qc.invalidateQueries({ queryKey: ["teacher", "courses", courseId, "content"] });
      }
    },
  });
}
