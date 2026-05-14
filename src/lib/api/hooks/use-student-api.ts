import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ApiError, apiFetch, apiPost } from "../client";
import type {
  Course,
  CourseContent,
  CourseDetail,
  CourseTag,
  LearningOutcome,
  LessonResource,
  StreamUrlResponse,
} from "../types/common";
import type {
  CourseLessonsProgress,
  CourseModulesStatus,
  CourseStatus,
  Notification,
  QuizAttemptRead,
  QuizAttemptResult,
} from "../types/student";
import type { QuizQuestionRead, QuizRead } from "../types/teacher";

export function useCourseList() {
  return useQuery({
    queryKey: ["courses"],
    queryFn: () => apiFetch<Course[]>("/courses"),
    staleTime: 1000 * 60 * 5,
  });
}

export function useMyCourses() {
  return useQuery({
    queryKey: ["courses", "mine"],
    queryFn: () => apiFetch<Course[]>("/me/courses"),
    staleTime: 1000 * 60 * 2,
  });
}

export function useCourseById(courseId: string | undefined) {
  return useQuery({
    queryKey: ["courses", courseId],
    queryFn: () => apiFetch<CourseDetail>(`/courses/${courseId}`),
    enabled: !!courseId,
    staleTime: 1000 * 60 * 5,
  });
}

export function useCourseBySlug(slug: string | undefined) {
  return useQuery({
    queryKey: ["courses", "by-slug", slug],
    queryFn: () => apiFetch<CourseDetail>(`/courses/by-slug/${slug}`),
    enabled: !!slug,
    staleTime: 1000 * 60 * 5,
  });
}

export function useCourseContent(courseId: string | undefined) {
  return useQuery({
    queryKey: ["courses", courseId, "content"],
    queryFn: () => apiFetch<CourseContent>(`/courses/${courseId}/content`),
    enabled: !!courseId,
    staleTime: 1000 * 60 * 10,
  });
}

export function useCourseOutcomes(courseId: string | undefined) {
  return useQuery({
    queryKey: ["courses", courseId, "outcomes"],
    queryFn: () => apiFetch<LearningOutcome[]>(`/courses/${courseId}/outcomes`),
    enabled: !!courseId,
    staleTime: 1000 * 60 * 10,
  });
}

export function useCourseTags(courseId: string | undefined) {
  return useQuery({
    queryKey: ["courses", courseId, "tags"],
    queryFn: () => apiFetch<CourseTag[]>(`/courses/${courseId}/tags`),
    enabled: !!courseId,
    staleTime: 1000 * 60 * 10,
  });
}

export function useCourseStatus(courseId: string | undefined) {
  return useQuery({
    queryKey: ["courses", courseId, "status"],
    queryFn: () => apiFetch<CourseStatus>(`/courses/${courseId}/status/me`),
    enabled: !!courseId,
  });
}

export function useCourseLessonsProgress(courseId: string | undefined) {
  return useQuery({
    queryKey: ["courses", courseId, "lessons-progress"],
    queryFn: async () => {
      try {
        return await apiFetch<CourseLessonsProgress>(`/courses/${courseId}/lessons/progress/me`);
      } catch (e: unknown) {
        if (e instanceof ApiError && e.status === 404) return null;
        throw e;
      }
    },
    enabled: !!courseId,
    staleTime: 1000 * 30,
  });
}

export function useCourseModulesStatus(courseId: string | undefined) {
  return useQuery({
    queryKey: ["courses", courseId, "modules-status"],
    queryFn: async () => {
      try {
        return await apiFetch<CourseModulesStatus>(`/courses/${courseId}/modules/status/me`);
      } catch (e: unknown) {
        if (e instanceof ApiError && e.status === 404) return null;
        throw e;
      }
    },
    enabled: !!courseId,
    staleTime: 1000 * 30,
  });
}

export function useLessonResources(lessonId: string | undefined) {
  return useQuery({
    queryKey: ["lessons", lessonId, "resources"],
    queryFn: () => apiFetch<LessonResource[]>(`/lessons/${lessonId}/resources`),
    enabled: !!lessonId,
    staleTime: 1000 * 60 * 5,
  });
}

export function useMaterialStreamUrl(materialId: string | null | undefined) {
  return useQuery({
    queryKey: ["materials", materialId, "stream-url"],
    queryFn: () => apiFetch<StreamUrlResponse>(`/materials/${materialId}/stream-url`),
    enabled: !!materialId,
    staleTime: 1000 * 60 * 4,
  });
}

export async function fetchResourceDownloadUrl(resourceId: string): Promise<string> {
  const data = await apiFetch<StreamUrlResponse>(`/lesson-resources/${resourceId}/download-url`);
  return data.stream_url;
}

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

export function useNotifications() {
  return useQuery({
    queryKey: ["notifications"],
    queryFn: () => apiFetch<Notification[]>("/notifications"),
  });
}
