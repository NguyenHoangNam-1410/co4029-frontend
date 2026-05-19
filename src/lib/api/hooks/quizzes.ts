import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import i18n from "@/i18n";
import { apiDelete, apiFetch, apiPatch, apiPost } from "../client";
import { ApiError } from "../client";
import { queryKeys } from "../query-keys";
import type {
  BulkSetExpectedTimeRequest,
  BulkSetExpectedTimeResponse,
  GenerationRunRead,
  QuizAttemptAnswerRead,
  QuizAttemptRead,
  QuizAttemptStart,
  QuizAttemptSubmitAnswer,
  QuizAuthoring,
  QuizForAuthoringPublic,
  QuizForTakingPublic,
  QuizPublic,
  QuizQuestionAuthoring,
} from "../types";

const TERMINAL_GENERATION_STATUSES = new Set([
  "completed",
  "succeeded",
  "failed",
  "cancelled",
]);

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

export function useQuizAuthoring(quizId: string | null | undefined) {
  return useQuery({
    queryKey: queryKeys.quizzes.authoring(quizId ?? ""),
    queryFn: () =>
      apiFetch<QuizForAuthoringPublic>(`/teacher/quizzes/${quizId}`),
    enabled: !!quizId,
  });
}

export function useCreateQuiz(courseId: string | null | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      apiPost<QuizAuthoring>(
        `/teacher/courses/${courseId}/quizzes`,
        payload,
      ),
    onSuccess: (quiz) => {
      void qc.invalidateQueries({
        queryKey: queryKeys.quizzes.authoring(quiz.id),
      });
      if (courseId) {
        void qc.invalidateQueries({
          queryKey: queryKeys.courses.content(courseId),
        });
      }
    },
  });
}

export function usePatchQuiz(quizId: string | null | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      apiPatch<QuizAuthoring>(`/teacher/quizzes/${quizId}`, payload),
    onSuccess: (quiz) => {
      void qc.invalidateQueries({
        queryKey: queryKeys.quizzes.authoring(quiz.id),
      });
      void qc.invalidateQueries({
        queryKey: queryKeys.courses.content(quiz.course_id),
      });
    },
  });
}

const PUBLISH_MISSING_TEXP_KEY = "teacher_quiz_manage.errors.publish_missing_t_exp";

export function usePublishQuiz(quizId: string | null | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () =>
      apiPost<QuizAuthoring>(`/teacher/quizzes/${quizId}/publish`),
    onSuccess: (quiz) => {
      void qc.invalidateQueries({
        queryKey: queryKeys.quizzes.authoring(quiz.id),
      });
      void qc.invalidateQueries({
        queryKey: queryKeys.courses.content(quiz.course_id),
      });
    },
    onError: (err: unknown) => {
      if (
        err instanceof ApiError &&
        err.status === 422 &&
        (err.code === "missing_t_exp" ||
          err.code === "missing_expected_response_time" ||
          err.code === "missing_expected_time")
      ) {
        toast.error(i18n.t(PUBLISH_MISSING_TEXP_KEY));
      }
    },
  });
}

export function useDeleteQuiz(quizId: string | null | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => apiDelete(`/teacher/quizzes/${quizId}`),
    onSuccess: () => {
      if (quizId) {
        qc.removeQueries({ queryKey: queryKeys.quizzes.authoring(quizId) });
        qc.removeQueries({ queryKey: queryKeys.quizzes.questions(quizId) });
      }
    },
  });
}

export function useAddQuizQuestion(quizId: string | null | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      apiPost<QuizQuestionAuthoring>(
        `/teacher/quizzes/${quizId}/questions`,
        payload,
      ),
    onSuccess: () => {
      if (quizId) {
        void qc.invalidateQueries({
          queryKey: queryKeys.quizzes.authoring(quizId),
        });
        void qc.invalidateQueries({
          queryKey: queryKeys.quizzes.questions(quizId),
        });
      }
    },
  });
}

export function useUpdateQuizQuestion(
  quizId: string | null | undefined,
  questionId: string | null | undefined,
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      apiPatch<QuizQuestionAuthoring>(
        `/teacher/quizzes/${quizId}/questions/${questionId}`,
        payload,
      ),
    onSuccess: () => {
      if (quizId) {
        void qc.invalidateQueries({
          queryKey: queryKeys.quizzes.authoring(quizId),
        });
        void qc.invalidateQueries({
          queryKey: queryKeys.quizzes.questions(quizId),
        });
      }
    },
  });
}

export function useDeleteQuizQuestion(
  quizId: string | null | undefined,
  questionId: string | null | undefined,
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () =>
      apiDelete(`/teacher/quizzes/${quizId}/questions/${questionId}`),
    onSuccess: () => {
      if (quizId) {
        void qc.invalidateQueries({
          queryKey: queryKeys.quizzes.authoring(quizId),
        });
        void qc.invalidateQueries({
          queryKey: queryKeys.quizzes.questions(quizId),
        });
      }
    },
  });
}

export function useRegenerateQuestion(
  quizId: string | null | undefined,
  questionId: string | null | undefined,
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () =>
      apiPost<GenerationRunRead>(
        `/teacher/quizzes/${quizId}/questions/${questionId}/regenerate`,
      ),
    onSuccess: () => {
      if (quizId) {
        void qc.invalidateQueries({
          queryKey: queryKeys.quizzes.authoring(quizId),
        });
        void qc.invalidateQueries({
          queryKey: queryKeys.quizzes.questions(quizId),
        });
      }
    },
  });
}

export function useGenerateQuiz(quizId: string | null | undefined) {
  return useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      apiPost<GenerationRunRead>(
        `/teacher/quizzes/${quizId}/generate`,
        payload,
      ),
  });
}

export function useQuizGenerationRun(
  quizId: string | null | undefined,
  runId: string | null | undefined,
) {
  const qc = useQueryClient();
  return useQuery({
    queryKey: queryKeys.quizzes.generationRun(quizId ?? "", runId ?? ""),
    enabled: !!quizId && !!runId,
    queryFn: async () => {
      const run = await apiFetch<GenerationRunRead>(
        `/teacher/quizzes/${quizId}/generation-runs/${runId}`,
      );
      if (quizId && run.status === "completed") {
        void qc.invalidateQueries({
          queryKey: queryKeys.quizzes.authoring(quizId),
        });
        void qc.invalidateQueries({
          queryKey: queryKeys.quizzes.questions(quizId),
        });
      }
      return run;
    },
    refetchInterval: (query) => {
      const data = query.state.data;
      if (data && TERMINAL_GENERATION_STATUSES.has(data.status)) {
        return false;
      }
      return 3000;
    },
  });
}

export function useBulkSetExpectedTime(quizId: string | null | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      question_ids,
      expected_seconds,
    }: {
      question_ids: string[];
      expected_seconds: number;
    }) => {
      if (question_ids.length === 0) {
        throw new Error(i18n.t("teacher_quiz_manage.errors.bulk_select_required"));
      }
      if (!Number.isFinite(expected_seconds) || expected_seconds <= 0) {
        throw new Error(i18n.t("teacher_quiz_manage.errors.bulk_seconds_positive"));
      }
      const body: BulkSetExpectedTimeRequest = {
        items: question_ids.map((qid) => ({
          question_id: qid,
          expected_response_time_ms: Math.round(expected_seconds * 1000),
        })),
      };
      return apiPost<BulkSetExpectedTimeResponse>(
        `/teacher/quizzes/${quizId}/questions/bulk-set-expected-time`,
        body,
      );
    },
    onSuccess: () => {
      if (quizId) {
        void qc.invalidateQueries({
          queryKey: queryKeys.quizzes.authoring(quizId),
        });
        void qc.invalidateQueries({
          queryKey: queryKeys.quizzes.questions(quizId),
        });
      }
    },
  });
}
