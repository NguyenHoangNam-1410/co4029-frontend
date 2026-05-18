import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiDelete, apiFetch, apiPatch, apiPost } from "../client";
import type { QuizAttemptRead, QuizAttemptResult } from "../types/student";
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
    queryKey: ["student", "quizzes", quizId],
    queryFn: () => apiFetch<QuizRead>(`/quizzes/${quizId}`),
    enabled: !!quizId,
  });
}

export function useStudentQuizQuestions(quizId: string | null | undefined) {
  return useQuery({
    queryKey: ["student", "quizzes", quizId, "questions"],
    queryFn: () => apiFetch<QuizQuestionRead[]>(`/quizzes/${quizId}/questions`),
    enabled: !!quizId,
  });
}

export function useMyQuizAttempts(quizId: string | null | undefined) {
  return useQuery({
    queryKey: ["student", "quizzes", quizId, "attempts", "me"],
    queryFn: () => apiFetch<QuizAttemptRead[]>(`/quizzes/${quizId}/attempts/me`),
    enabled: !!quizId,
  });
}

export function useQuizAttemptResult(attemptId: string | null | undefined) {
  return useQuery({
    queryKey: ["student", "quiz-attempts", attemptId, "result"],
    queryFn: () => apiFetch<QuizAttemptResult>(`/quiz-attempts/${attemptId}/result`),
    enabled: !!attemptId,
  });
}

export function useCreateQuizAttempt(quizId: string | null | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => apiPost<QuizAttemptRead>(`/quizzes/${quizId}/attempts`, {}),
    onSuccess: (attempt) => {
      qc.invalidateQueries({ queryKey: ["student", "quizzes", attempt.quiz_id, "attempts", "me"] });
    },
  });
}

export function useAnswerQuizAttempt() {
  return useMutation({
    mutationFn: ({
      attemptId,
      payload,
    }: {
      attemptId: string;
      payload: {
        question_id: string;
        selected_option_id?: string | null;
        answer_text?: string | null;
        hint_used?: boolean;
        response_time_ms?: number | null;
      };
    }) => apiPost(`/quiz-attempts/${attemptId}/answers`, payload),
  });
}

export function useSubmitQuizAttempt() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (attemptId: string) => apiPost<QuizAttemptRead>(`/quiz-attempts/${attemptId}/submit`),
    onSuccess: (attempt) => {
      qc.invalidateQueries({ queryKey: ["student", "quizzes", attempt.quiz_id, "attempts", "me"] });
      qc.invalidateQueries({ queryKey: ["student", "quiz-attempts", attempt.id, "result"] });
    },
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
