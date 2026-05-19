import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "@tanstack/react-router";
import { toast } from "sonner";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Bot,
  CheckCircle2,
  Clock,
  Flag,
  Sparkles,
  Timer,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CardCooldownBadge } from "@/components/ui/card-cooldown-badge";
import { GlassCard } from "@/components/ui/glass-card";
import { GradientProgress } from "@/components/ui/gradient-progress";
import { ApiError } from "@/lib/api/client";
import { useCourseBySlug } from "@/lib/api/hooks/courses";
import {
  useMyQuizAttempts,
  useStartQuizAttempt,
  useStudentQuiz,
  useSubmitQuizAnswer,
  useSubmitQuizAttempt,
} from "@/lib/api/hooks/quizzes";
import { useCardCooldown } from "@/lib/api/cooldown";
import { isApiErrorCode } from "@/lib/api/error-codes";
import type {
  QuizAttemptRead,
  QuizForTakingPublic,
  QuizPublic,
  QuizQuestionPublic,
} from "@/lib/api/types";
import { cn } from "@/lib/utils";

type QuestionState = "completed" | "active" | "flagged" | "pending";

interface QuestionStatus {
  selectedOptionId: string | null;
  flagged: boolean;
  hintViewed: boolean;
  savedToServer: boolean;
}

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60).toString().padStart(2, "0");
  const s = (seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

function questionState(idx: number, activeIdx: number, status: QuestionStatus): QuestionState {
  if (status.flagged) return "flagged";
  if (status.selectedOptionId !== null) return "completed";
  if (idx === activeIdx) return "active";
  return "pending";
}

function extractRetryAt(err: unknown): string | null {
  if (!(err instanceof ApiError)) return null;
  const parsed = err.parsedBody;
  if (!parsed || typeof parsed !== "object") return null;
  const detail = (parsed as { detail?: unknown }).detail;
  if (!detail || typeof detail !== "object") return null;
  const retry = (detail as { retry_available_at?: unknown }).retry_available_at;
  return typeof retry === "string" ? retry : null;
}

function QuizStudyModeCard({
  allowRetakes,
  maxAttempts,
  showHints,
  cooldownHours,
}: {
  allowRetakes: boolean;
  maxAttempts: number | null | undefined;
  showHints: boolean;
  cooldownHours: number | null | undefined;
}) {
  return (
    <GlassCard className="p-6">
      <h4 className="font-headline font-bold text-m3-primary text-sm mb-4">Cấu hình bài quiz</h4>
      <div className="space-y-3 text-sm">
        <div className="flex items-start justify-between gap-4">
          <span className="text-m3-on-surface-variant">Gợi ý</span>
          <span className="font-semibold text-m3-on-surface">
            {showHints ? "Có sẵn" : "Tắt"}
          </span>
        </div>
        <div className="flex items-start justify-between gap-4">
          <span className="text-m3-on-surface-variant">Làm lại</span>
          <span className="font-semibold text-m3-on-surface">
            {allowRetakes
              ? maxAttempts != null
                ? `Tối đa ${maxAttempts} lần`
                : "Cho phép"
              : "Không cho phép"}
          </span>
        </div>
        {cooldownHours != null && cooldownHours > 0 && (
          <div className="flex items-start justify-between gap-4">
            <span className="text-m3-on-surface-variant">Thời gian chờ</span>
            <span className="font-semibold text-m3-on-surface">{cooldownHours} giờ</span>
          </div>
        )}
      </div>
    </GlassCard>
  );
}

function QuizIntroPanel({
  quiz,
  attempts,
  onStart,
  starting,
}: {
  quiz: QuizPublic;
  attempts: QuizAttemptRead[];
  onStart: () => void;
  starting: boolean;
}) {
  const completed = attempts.filter((a) => a.status === "submitted" || a.status === "graded").length;
  const passingScore = Math.round(Number(quiz.passing_score_percent));
  const maxAttemptsReached =
    quiz.max_attempts != null && completed >= quiz.max_attempts;
  const noRetakesLeft = completed > 0 && !quiz.allow_retakes;
  const blocked = maxAttemptsReached || noRetakesLeft;

  return (
    <div className="max-w-2xl w-full mx-auto space-y-6">
      <GlassCard className="p-8 sm:p-10 text-center">
        <h1 className="font-headline font-extrabold text-3xl text-m3-primary mb-3">
          {quiz.title}
        </h1>
        {quiz.description && (
          <p className="text-m3-on-surface-variant mb-6">{quiz.description}</p>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-8 text-left">
          <div className="rounded-xl bg-m3-surface-container-low p-4">
            <span className="block text-[10px] text-m3-outline uppercase font-bold mb-1 tracking-wider">
              Điểm đạt
            </span>
            <span className="text-xl font-black font-headline text-m3-primary">
              {passingScore}%
            </span>
          </div>
          <div className="rounded-xl bg-m3-surface-container-low p-4">
            <span className="block text-[10px] text-m3-outline uppercase font-bold mb-1 tracking-wider">
              Thời gian
            </span>
            <span className="text-xl font-black font-headline text-m3-on-surface">
              {quiz.time_limit_seconds ? formatTime(quiz.time_limit_seconds) : "Không giới hạn"}
            </span>
          </div>
          <div className="rounded-xl bg-m3-surface-container-low p-4">
            <span className="block text-[10px] text-m3-outline uppercase font-bold mb-1 tracking-wider">
              Lượt đã làm
            </span>
            <span className="text-xl font-black font-headline text-m3-secondary">
              {completed}
              {quiz.max_attempts != null && (
                <span className="text-sm text-m3-outline-variant font-medium">
                  /{quiz.max_attempts}
                </span>
              )}
            </span>
          </div>
        </div>

        {blocked ? (
          <div className="rounded-xl bg-m3-surface-container-low px-4 py-3 text-sm text-m3-on-surface-variant">
            {noRetakesLeft && "Bài quiz này không cho phép làm lại."}
            {maxAttemptsReached && ` Bạn đã sử dụng hết ${quiz.max_attempts} lượt.`}
          </div>
        ) : (
          <Button
            onClick={onStart}
            disabled={starting}
            className="gradient-primary text-white rounded-xl font-bold gap-2 px-8 py-3 h-auto"
          >
            {starting ? "Đang khởi tạo..." : "Bắt đầu làm bài"}
            <ArrowRight className="h-4 w-4" />
          </Button>
        )}
      </GlassCard>
    </div>
  );
}

function QuestionSubmitButton({
  isLastQuestion,
  isSavedAnswer,
  hasSelection,
  isSavingAnswer,
  isFinalSubmitting,
  cooldownRetryAt: cooldownAt,
  onSaveNext,
  onFinalSubmit,
}: {
  isLastQuestion: boolean;
  isSavedAnswer: boolean;
  hasSelection: boolean;
  isSavingAnswer: boolean;
  isFinalSubmitting: boolean;
  cooldownRetryAt: string | null;
  onSaveNext: () => void;
  onFinalSubmit: () => void;
}) {
  const cooldown = useCardCooldown(cooldownAt);
  const cooldownActive = !!cooldownAt && !cooldown.isExpired;
  const disabled =
    !hasSelection || isSavingAnswer || isFinalSubmitting || cooldownActive;

  if (isLastQuestion) {
    return (
      <div className="flex items-center gap-3 flex-wrap">
        {cooldownActive && <CardCooldownBadge retryAt={cooldownAt} />}
        <Button
          onClick={onFinalSubmit}
          disabled={disabled}
          className="gradient-primary text-white font-bold rounded-xl gap-2 shadow-ai-glow px-6 py-3 h-auto hover:opacity-90 active:scale-95 transition-all"
        >
          {isFinalSubmitting
            ? "Đang nộp..."
            : isSavingAnswer
              ? "Đang lưu..."
              : "Nộp bài"}
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 flex-wrap">
      {cooldownActive && <CardCooldownBadge retryAt={cooldownAt} />}
      <Button
        onClick={onSaveNext}
        disabled={disabled}
        className="gradient-primary text-white font-bold rounded-xl gap-2 shadow-ai-glow px-6 py-3 h-auto hover:opacity-90 active:scale-95 transition-all"
      >
        {isSavingAnswer
          ? "Đang lưu..."
          : isSavedAnswer
            ? "Tiếp theo"
            : "Lưu & tiếp tục"}
        <ArrowRight className="h-4 w-4" />
      </Button>
    </div>
  );
}

export default function CourseQuizPage() {
  const { slug, quizId } = useParams({ strict: false }) as { slug: string; quizId: string };

  const { data: course, isLoading: courseLoading } = useCourseBySlug(slug);
  const { data: quiz, isLoading: quizLoading } = useStudentQuiz(quizId);
  const { data: attempts = [], isLoading: attemptsLoading } = useMyQuizAttempts(quizId);

  const startAttempt = useStartQuizAttempt(quizId);

  const [taking, setTaking] = useState<QuizForTakingPublic | null>(null);
  const [activeAttemptId, setActiveAttemptId] = useState<string | null>(null);
  const [activeIdx, setActiveIdx] = useState(0);
  const [statuses, setStatuses] = useState<QuestionStatus[]>([]);
  const [timeLeft, setTimeLeft] = useState(0);
  const [submittedSummary, setSubmittedSummary] = useState<QuizAttemptRead | null>(null);
  const [perQuestionCooldown, setPerQuestionCooldown] = useState<Record<string, string>>({});

  const submitAnswer = useSubmitQuizAnswer(activeAttemptId);
  const submitAttempt = useSubmitQuizAttempt(activeAttemptId);

  const autoSubmitStartedRef = useRef(false);
  const questionSeenAtRef = useRef<Record<string, number>>({});

  const displayQuestions: QuizQuestionPublic[] = useMemo(
    () => (taking ? [...taking.questions].sort((a, b) => a.position - b.position) : []),
    [taking],
  );

  const sessionReady =
    taking !== null &&
    statuses.length === displayQuestions.length &&
    displayQuestions.length > 0;

  useEffect(() => {
    const activeQuestionId = displayQuestions[activeIdx]?.id;
    if (!activeQuestionId || questionSeenAtRef.current[activeQuestionId]) return;
    questionSeenAtRef.current[activeQuestionId] = Date.now();
  }, [activeIdx, displayQuestions]);

  useEffect(() => {
    if (!quiz?.time_limit_seconds || !sessionReady || submittedSummary) return;
    const timerId = window.setInterval(() => {
      setTimeLeft((current) => Math.max(current - 1, 0));
    }, 1000);
    return () => window.clearInterval(timerId);
  }, [quiz?.time_limit_seconds, sessionReady, submittedSummary]);

  async function handleStartAttempt() {
    try {
      const result = await startAttempt.mutateAsync(undefined);
      setTaking(result);
      setStatuses(
        result.questions.map(() => ({
          selectedOptionId: null,
          flagged: false,
          hintViewed: false,
          savedToServer: false,
        })),
      );
      setActiveIdx(0);
      setTimeLeft(result.quiz.time_limit_seconds ?? 0);
      autoSubmitStartedRef.current = false;
      questionSeenAtRef.current = {};
      setPerQuestionCooldown({});
    } catch (err) {
      toast.error(
        err instanceof ApiError && err.status === 429
          ? "Quá nhiều yêu cầu, vui lòng thử lại sau"
          : "Không thể bắt đầu bài quiz",
      );
    }
  }

  useEffect(() => {
    if (!taking || activeAttemptId) return;
    const inProgress = attempts.find((a) => a.status === "in_progress");
    if (inProgress) setActiveAttemptId(inProgress.id);
  }, [taking, attempts, activeAttemptId]);

  async function persistAnswer(questionIdx: number): Promise<boolean> {
    const question = displayQuestions[questionIdx];
    const status = statuses[questionIdx];
    if (!question || !status?.selectedOptionId || !activeAttemptId) return false;
    if (status.savedToServer) return true;
    const startedAt = questionSeenAtRef.current[question.id];
    const tActualMs = startedAt ? Math.max(Date.now() - startedAt, 0) : null;

    try {
      await submitAnswer.mutateAsync({
        question_id: question.id,
        selected_option_id: status.selectedOptionId,
        hint_used: status.hintViewed,
        t_actual_ms: tActualMs,
      });
      setStatuses((current) =>
        current.map((s, i) => (i === questionIdx ? { ...s, savedToServer: true } : s)),
      );
      setPerQuestionCooldown((prev) => {
        if (!prev[question.id]) return prev;
        const next = { ...prev };
        delete next[question.id];
        return next;
      });
      return true;
    } catch (err) {
      if (isApiErrorCode(err, "card_cooldown_active")) {
        const retryAt = extractRetryAt(err);
        if (retryAt) {
          setPerQuestionCooldown((prev) => ({ ...prev, [question.id]: retryAt }));
        }
        toast.error("Câu hỏi đang trong thời gian chờ");
        return false;
      }
      if (err instanceof ApiError && err.status === 429) {
        toast.error("Quá nhiều yêu cầu, vui lòng thử lại sau");
        return false;
      }
      toast.error((err as Error).message || "Không thể lưu câu trả lời");
      return false;
    }
  }

  async function handleSaveNext() {
    const ok = await persistAnswer(activeIdx);
    if (ok) {
      setActiveIdx((current) => Math.min(displayQuestions.length - 1, current + 1));
    }
  }

  async function handleFinalSubmit(trigger: "manual" | "timeout") {
    if (!sessionReady || !activeAttemptId) return;
    if (submitAttempt.isPending) return;

    for (let i = 0; i < displayQuestions.length; i += 1) {
      const status = statuses[i];
      if (!status?.selectedOptionId) continue;
      if (status.savedToServer) continue;
      const ok = await persistAnswer(i);
      if (!ok) return;
    }

    try {
      const result = await submitAttempt.mutateAsync();
      setSubmittedSummary(result);
      if (trigger === "timeout") {
        toast.error("Đã hết giờ. Bài quiz đã được nộp tự động.");
      }
    } catch (err) {
      toast.error((err as Error).message || "Không thể nộp bài quiz");
    }
  }

  useEffect(() => {
    if (
      !quiz?.time_limit_seconds ||
      !sessionReady ||
      timeLeft > 0 ||
      submittedSummary ||
      submitAttempt.isPending
    ) {
      return;
    }
    if (autoSubmitStartedRef.current) return;
    autoSubmitStartedRef.current = true;
    void handleFinalSubmit("timeout");
  }, [
    handleFinalSubmit,
    quiz?.time_limit_seconds,
    sessionReady,
    submittedSummary,
    submitAttempt.isPending,
    timeLeft,
  ]);

  if (courseLoading || quizLoading || attemptsLoading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center bg-m3-surface px-6">
        <div className="space-y-3 w-full max-w-sm">
          <div className="h-4 rounded-full bg-m3-surface-container animate-pulse" />
          <div className="h-4 rounded-full bg-m3-surface-container animate-pulse w-4/5" />
          <div className="h-32 rounded-xl bg-m3-surface-container animate-pulse mt-6" />
        </div>
      </div>
    );
  }

  if (!course || !quiz) {
    return (
      <div className="min-h-[70vh] bg-m3-surface flex items-center justify-center p-8">
        <GlassCard className="p-10 text-center max-w-md">
          <BookOpen className="h-10 w-10 text-m3-outline mx-auto mb-4" />
          <h2 className="font-headline font-bold text-xl text-m3-on-surface mb-2">
            Không tìm thấy bài quiz
          </h2>
          <p className="text-sm text-m3-on-surface-variant mb-6">
            Bài quiz này không tải được cho khoá học.
          </p>
          <Link to="/courses/$slug/learn" params={{ slug }}>
            <Button className="gradient-primary text-white rounded-xl font-bold gap-2">
              <ArrowLeft className="h-4 w-4" />
              Quay lại khoá học
            </Button>
          </Link>
        </GlassCard>
      </div>
    );
  }

  if (submittedSummary) {
    const score = Number(submittedSummary.score_percent ?? 0);
    const passed = Boolean(submittedSummary.passed);
    const passingScore = Math.round(Number(quiz.passing_score_percent));

    return (
      <div className="min-h-[70vh] bg-m3-surface flex flex-col items-center justify-center p-6 sm:p-8">
        <div className="max-w-3xl w-full space-y-6">
          <GlassCard className="p-8 sm:p-10 text-center">
            <div
              className={cn(
                "w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6 text-4xl font-black font-headline shadow-lg",
                passed
                  ? "bg-gradient-to-br from-emerald-400 to-teal-500 text-white"
                  : "bg-gradient-to-br from-m3-primary to-m3-secondary text-white",
              )}
            >
              {Math.round(score)}%
            </div>
            <h2 className="font-headline font-extrabold text-2xl text-m3-primary mb-1">
              {passed ? "Đạt yêu cầu" : "Bài đã được nộp"}
            </h2>
            <p className="text-m3-on-surface-variant text-sm mb-2">
              {passed
                ? `Bạn đã hoàn thành ${quiz.title} với ${Math.round(score)}%.`
                : `Bạn đạt ${Math.round(score)}% và cần ${passingScore}% để qua.`}
            </p>
            <p className="text-xs text-m3-outline mb-6">
              Lượt {submittedSummary.attempt_number} • {submittedSummary.correct_count ?? 0}/
              {submittedSummary.total_questions ?? displayQuestions.length} câu đúng
            </p>

            <div className="flex gap-3 justify-center flex-wrap">
              <Link to="/courses/$slug/learn" params={{ slug }}>
                <Button variant="outline" className="rounded-xl ghost-border font-bold text-sm gap-2">
                  <ArrowLeft className="h-4 w-4" />
                  Quay lại khoá học
                </Button>
              </Link>
            </div>
          </GlassCard>

          <QuizStudyModeCard
            allowRetakes={quiz.allow_retakes}
            maxAttempts={quiz.max_attempts}
            showHints={quiz.show_hints}
            cooldownHours={quiz.cooldown_hours}
          />
        </div>
      </div>
    );
  }

  if (!taking) {
    return (
      <div className="min-h-[70vh] bg-m3-surface flex items-center justify-center px-4 sm:px-6 py-10">
        <QuizIntroPanel
          quiz={quiz}
          attempts={attempts}
          onStart={() => void handleStartAttempt()}
          starting={startAttempt.isPending}
        />
      </div>
    );
  }

  const activeQuestion = displayQuestions[activeIdx];
  const activeStatus = statuses[activeIdx] ?? {
    selectedOptionId: null,
    flagged: false,
    hintViewed: false,
    savedToServer: false,
  };
  const completedCount = statuses.filter((s) => s.selectedOptionId !== null).length;
  const flaggedCount = statuses.filter((s) => s.flagged).length;
  const progressPct = displayQuestions.length
    ? Math.round((completedCount / displayQuestions.length) * 100)
    : 0;
  const isLastQuestion = activeIdx === displayQuestions.length - 1;
  const isTimeLow = Boolean(quiz.time_limit_seconds) && timeLeft < 120;
  const passingScore = Math.round(Number(quiz.passing_score_percent));
  const activeQuestionCooldown = activeQuestion
    ? perQuestionCooldown[activeQuestion.id] ?? null
    : null;

  return (
    <div className="min-h-[70vh] bg-m3-surface pb-20">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
          <div className="flex items-center gap-3 flex-wrap">
            <Link to="/courses/$slug/learn" params={{ slug }}>
              <Button variant="ghost" size="sm" className="rounded-xl text-m3-on-surface-variant hover:text-m3-primary gap-1.5 text-xs font-bold px-3">
                <ArrowLeft className="h-4 w-4" />
                Khoá học
              </Button>
            </Link>
            <span className="text-m3-on-surface-variant text-sm font-medium hidden sm:block">
              {course.title}
            </span>
          </div>

          <div className="flex items-center gap-3 flex-wrap justify-end">
            {quiz.time_limit_seconds ? (
              <div
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-xl font-mono font-bold text-sm",
                  isTimeLow ? "bg-red-50 text-red-600 animate-pulse" : "bg-m3-surface-container text-m3-primary",
                )}
              >
                <Timer className="h-4 w-4" />
                {formatTime(sessionReady ? timeLeft : quiz.time_limit_seconds)}
              </div>
            ) : (
              <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-m3-surface-container text-m3-primary font-bold text-sm">
                <Clock className="h-4 w-4" />
                Không giới hạn thời gian
              </div>
            )}
          </div>
        </div>

        <div className="mb-8">
          <div className="flex justify-between items-end mb-3 gap-4 flex-wrap">
            <div>
              <h1 className="font-headline font-extrabold text-3xl sm:text-4xl text-m3-primary tracking-tight leading-none mb-1">
                {quiz.title}
              </h1>
              <p className="text-m3-on-surface-variant text-base">Đánh giá module</p>
            </div>
            <div className="text-right shrink-0">
              <span className="block font-headline font-bold text-2xl text-m3-secondary">
                {String(activeIdx + 1).padStart(2, "0")}{" "}
                <span className="text-m3-outline-variant font-medium text-sm">
                  / {displayQuestions.length}
                </span>
              </span>
              <span className="text-[10px] uppercase tracking-widest font-bold text-m3-outline">
                {attempts.length} lượt trước
              </span>
            </div>
          </div>
          <GradientProgress value={progressPct} variant="secondary" size="sm" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-8">
            <div className="bg-m3-surface-container-lowest rounded-xl p-6 sm:p-10 relative overflow-hidden shadow-editorial">
              <div className="absolute top-0 right-0 m-5">
                <Badge className="bg-m3-secondary-fixed text-m3-on-surface border-0 font-bold text-[10px] px-3 py-1.5 gap-1.5 rounded-full">
                  <Sparkles className="h-3 w-3" />
                  ĐANG LÀM
                </Badge>
              </div>

              <div className="mb-8 pt-2">
                <span className="text-m3-secondary font-headline font-bold text-xs tracking-widest uppercase mb-3 block">
                  Câu hỏi {String(activeIdx + 1).padStart(2, "0")}
                </span>
                <h2 className="text-xl sm:text-2xl font-headline font-bold text-m3-on-surface leading-snug">
                  {activeQuestion.prompt_text}
                </h2>
              </div>

              <div className="space-y-3">
                {activeQuestion.options
                  .slice()
                  .sort((a, b) => a.position - b.position)
                  .map((option) => {
                    const isSelected = activeStatus.selectedOptionId === option.id;
                    return (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => {
                          if (submitAnswer.isPending || submitAttempt.isPending) return;
                          setStatuses((current) =>
                            current.map((status, index) =>
                              index === activeIdx
                                ? {
                                    ...status,
                                    selectedOptionId: option.id,
                                    savedToServer: false,
                                  }
                                : status,
                            ),
                          );
                        }}
                        className={cn(
                          "w-full text-left p-5 sm:p-6 rounded-xl flex items-center gap-5 transition-all duration-200 border-2 group/opt cursor-pointer",
                          isSelected
                            ? "bg-m3-primary-fixed/20 border-m3-primary shadow-lg shadow-m3-primary/10 ring-2 ring-m3-primary"
                            : "bg-m3-surface-container-low border-transparent hover:bg-m3-surface-container-high hover:border-m3-outline-variant/30",
                        )}
                      >
                        <span
                          className={cn(
                            "w-10 h-10 shrink-0 flex items-center justify-center rounded-xl font-bold text-sm transition-colors shadow-sm",
                            isSelected
                              ? "bg-m3-primary text-white"
                              : "bg-m3-surface-container-lowest text-m3-primary group-hover/opt:bg-m3-primary group-hover/opt:text-white",
                          )}
                        >
                          {option.option_key}
                        </span>
                        <span
                          className={cn(
                            "flex-1 text-sm sm:text-base leading-snug",
                            isSelected ? "text-m3-primary font-semibold" : "text-m3-on-surface font-medium",
                          )}
                        >
                          {option.option_text}
                        </span>
                        {isSelected && (
                          <CheckCircle2 className="h-5 w-5 text-m3-primary shrink-0 fill-m3-primary/10" />
                        )}
                      </button>
                    );
                  })}
              </div>
            </div>

            <div className="flex items-center justify-between mt-6 flex-wrap gap-3">
              <Button
                variant="ghost"
                onClick={() => setActiveIdx((current) => Math.max(0, current - 1))}
                disabled={activeIdx === 0 || submitAnswer.isPending || submitAttempt.isPending}
                className="font-bold text-m3-primary hover:bg-m3-primary-fixed/30 rounded-xl gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Trước
              </Button>

              <div className="flex items-center gap-3 flex-wrap justify-end">
                <Button
                  variant="ghost"
                  onClick={() => {
                    setStatuses((current) =>
                      current.map((status, index) =>
                        index === activeIdx ? { ...status, flagged: !status.flagged } : status,
                      ),
                    );
                  }}
                  disabled={submitAnswer.isPending || submitAttempt.isPending}
                  className={cn(
                    "font-bold rounded-xl gap-2 text-sm",
                    activeStatus.flagged
                      ? "text-amber-600 bg-amber-50 hover:bg-amber-100"
                      : "text-m3-outline hover:text-m3-on-surface",
                  )}
                >
                  <Flag className="h-4 w-4" />
                  {activeStatus.flagged ? "Bỏ đánh dấu" : "Đánh dấu"}
                </Button>

                <QuestionSubmitButton
                  isLastQuestion={isLastQuestion}
                  isSavedAnswer={activeStatus.savedToServer}
                  hasSelection={activeStatus.selectedOptionId !== null}
                  isSavingAnswer={submitAnswer.isPending}
                  isFinalSubmitting={submitAttempt.isPending}
                  cooldownRetryAt={activeQuestionCooldown}
                  onSaveNext={() => void handleSaveNext()}
                  onFinalSubmit={() => void handleFinalSubmit("manual")}
                />
              </div>
            </div>
          </div>

          <div className="lg:col-span-4 space-y-5">
            <GlassCard className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full gradient-primary flex items-center justify-center text-white shadow-ai-glow">
                  <Bot className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="font-headline font-bold text-m3-primary text-sm">Hướng dẫn</h4>
                  <p className="text-[10px] text-m3-outline uppercase font-bold tracking-wider">
                    Học viên
                  </p>
                </div>
              </div>

              {quiz.show_hints && activeQuestion.hint_text ? (
                activeStatus.hintViewed ? (
                  <p className="text-sm text-m3-on-surface-variant leading-relaxed">
                    <span className="text-m3-secondary font-bold">Gợi ý: </span>
                    {activeQuestion.hint_text}
                  </p>
                ) : (
                  <Button
                    variant="outline"
                    className="w-full justify-center rounded-xl ghost-border font-semibold"
                    onClick={() => {
                      setStatuses((current) =>
                        current.map((status, index) =>
                          index === activeIdx ? { ...status, hintViewed: true } : status,
                        ),
                      );
                    }}
                  >
                    Xem gợi ý
                  </Button>
                )
              ) : (
                <p className="text-sm text-m3-on-surface-variant leading-relaxed">
                  Chọn đáp án phù hợp nhất; có thể đánh dấu để xem lại sau.
                </p>
              )}
            </GlassCard>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-surface-elev rounded-xl p-4 shadow-sm">
                <span className="block text-[10px] text-m3-outline uppercase font-bold mb-1 tracking-wider">
                  Đã trả lời
                </span>
                <span className="text-xl font-black font-headline text-m3-primary">
                  {completedCount}
                  <span className="text-sm text-m3-outline-variant font-medium">
                    /{displayQuestions.length}
                  </span>
                </span>
              </div>
              <div className="bg-surface-elev rounded-xl p-4 shadow-sm">
                <span className="block text-[10px] text-m3-outline uppercase font-bold mb-1 tracking-wider">
                  Đánh dấu
                </span>
                <span className="text-xl font-black font-headline text-amber-500">{flaggedCount}</span>
              </div>
              <div className="bg-surface-elev rounded-xl p-4 shadow-sm col-span-2">
                <span className="block text-[10px] text-m3-outline uppercase font-bold mb-1 tracking-wider">
                  Điểm đạt
                </span>
                <span className="text-xl font-black font-headline text-m3-secondary">
                  {passingScore}%
                </span>
              </div>
            </div>

            <QuizStudyModeCard
              allowRetakes={quiz.allow_retakes}
              maxAttempts={quiz.max_attempts}
              showHints={quiz.show_hints}
              cooldownHours={quiz.cooldown_hours}
            />
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-m3-outline-variant/15">
          <h4 className="text-xs font-bold text-m3-outline uppercase tracking-widest mb-5 text-center">
            Tổng quan câu hỏi
          </h4>
          <div className="flex flex-wrap justify-center gap-2.5">
            {displayQuestions.map((question, index) => {
              const status = statuses[index] ?? {
                selectedOptionId: null,
                flagged: false,
                hintViewed: false,
                savedToServer: false,
              };
              const state = questionState(index, activeIdx, status);
              const onCooldown = !!perQuestionCooldown[question.id];
              return (
                <button
                  key={question.id}
                  type="button"
                  onClick={() => setActiveIdx(index)}
                  className={cn(
                    "w-10 h-10 rounded-xl font-bold text-sm transition-all duration-150 hover:scale-110 relative cursor-pointer",
                    state === "completed" && "bg-m3-primary text-white shadow-md",
                    state === "active" && "bg-surface-elev text-m3-primary ring-2 ring-m3-primary shadow-md",
                    state === "flagged" && "bg-amber-100 text-amber-700 ring-2 ring-amber-400",
                    state === "pending" && "bg-m3-surface-container-high text-m3-outline hover:bg-m3-surface-container-highest",
                  )}
                >
                  {index + 1}
                  {onCooldown && (
                    <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-amber-500 rounded-full ring-2 ring-m3-surface" />
                  )}
                  {state === "flagged" && !onCooldown && (
                    <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full ring-2 ring-m3-surface" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
