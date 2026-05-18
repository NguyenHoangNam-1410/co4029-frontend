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
  ExternalLink,
  Flag,
  Sparkles,
  Timer,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/glass-card";
import { GradientProgress } from "@/components/ui/gradient-progress";
import {
  useCourseBySlug,
} from "@/lib/api/hooks/courses";
import {
  useCreateQuizAttempt,
  useMyQuizAttempts,
  useQuizAttemptResult,
  useStudentQuiz,
  useStudentQuizQuestions,
  useSubmitQuizAttempt,
  useAnswerQuizAttempt,
} from "@/lib/api/hooks/quizzes";
import type { QuizQuestionRead } from "@/lib/api/types/teacher";
import { cn } from "@/lib/utils";

type QuestionState = "completed" | "active" | "flagged" | "pending";

interface QuestionStatus {
  selectedOptionId: string | null;
  flagged: boolean;
  hintViewed: boolean;
}

interface SourceRef {
  material_title?: string;
  material_type?: string;
  page?: number | null;
  timestamp_start?: number | null;
  timestamp_end?: number | null;
}

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0");
  const s = (seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

function formatAttemptTime(seconds: number | null) {
  if (!seconds || seconds < 1) return "Under a minute";
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  if (minutes < 1) return `${remainder}s`;
  if (remainder === 0) return `${minutes}m`;
  return `${minutes}m ${remainder}s`;
}

function formatCooldown(date: Date) {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function formatConfigDecimal(value: string | null | undefined) {
  if (!value) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed.toFixed(2) : value;
}

function formatConfigPercent(value: string | null | undefined) {
  if (!value) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? `${Math.round(parsed * 100) / 100}%` : value;
}

function formatSourceRef(ref: SourceRef) {
  const parts: string[] = [];
  if (ref.material_title) parts.push(ref.material_title);
  if (ref.page != null) parts.push(`Page ${ref.page}`);
  if (ref.timestamp_start != null && ref.timestamp_end != null) {
    parts.push(`${ref.timestamp_start}s - ${ref.timestamp_end}s`);
  }
  return parts.join(" • ") || "Reference material";
}

function hashString(input: string) {
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash * 31 + input.charCodeAt(i)) >>> 0;
  }
  return hash;
}

function stableShuffle<T>(items: T[], keyFn: (item: T) => string, salt: string) {
  return [...items].sort((a, b) => {
    const keyA = keyFn(a);
    const keyB = keyFn(b);
    const hashA = hashString(`${salt}:${keyA}`);
    const hashB = hashString(`${salt}:${keyB}`);
    return hashA - hashB || keyA.localeCompare(keyB);
  });
}

function questionState(idx: number, activeIdx: number, status: QuestionStatus): QuestionState {
  if (status.flagged) return "flagged";
  if (status.selectedOptionId !== null) return "completed";
  if (idx === activeIdx) return "active";
  return "pending";
}

function sourceRefsFromQuestion(question: QuizQuestionRead): SourceRef[] {
  if (!Array.isArray(question.source_refs_json)) return [];
  return question.source_refs_json.filter((item): item is SourceRef => typeof item === "object" && item !== null);
}

function QuizStudyModeCard({
  allowRetakes,
  maxAttempts,
  showHints,
  remindersEnabled,
  initialEf,
  minEfForUnlock,
  coverageThreshold,
}: {
  allowRetakes: boolean;
  maxAttempts: number | null;
  showHints: boolean;
  remindersEnabled: boolean;
  initialEf: string | null;
  minEfForUnlock: string | null;
  coverageThreshold: string | null;
}) {
  const hasAdaptiveConfig = Boolean(remindersEnabled || initialEf || minEfForUnlock || coverageThreshold);

  return (
    <GlassCard className="p-6">
      <h4 className="font-headline font-bold text-m3-primary text-sm mb-4">Study Mode</h4>
      <div className="space-y-3 text-sm">
        <div className="flex items-start justify-between gap-4">
          <span className="text-m3-on-surface-variant">Hints</span>
          <span className="font-semibold text-m3-on-surface">{showHints ? "Available" : "Disabled"}</span>
        </div>
        <div className="flex items-start justify-between gap-4">
          <span className="text-m3-on-surface-variant">Retakes</span>
          <span className="font-semibold text-m3-on-surface">
            {allowRetakes ? maxAttempts != null ? `${maxAttempts} max` : "Allowed" : "Not allowed"}
          </span>
        </div>
        {hasAdaptiveConfig && (
          <>
            <div className="pt-2 border-t border-m3-outline-variant/15" />
            <div className="flex items-start justify-between gap-4">
              <span className="text-m3-on-surface-variant">Review reminders</span>
              <span className="font-semibold text-m3-on-surface">{remindersEnabled ? "Enabled" : "Off"}</span>
            </div>
            {initialEf && (
              <div className="flex items-start justify-between gap-4">
                <span className="text-m3-on-surface-variant">Initial EF</span>
                <span className="font-semibold text-m3-on-surface">{formatConfigDecimal(initialEf)}</span>
              </div>
            )}
            {minEfForUnlock && (
              <div className="flex items-start justify-between gap-4">
                <span className="text-m3-on-surface-variant">Unlock EF floor</span>
                <span className="font-semibold text-m3-on-surface">{formatConfigDecimal(minEfForUnlock)}</span>
              </div>
            )}
            {coverageThreshold && (
              <div className="flex items-start justify-between gap-4">
                <span className="text-m3-on-surface-variant">Coverage target</span>
                <span className="font-semibold text-m3-on-surface">{formatConfigPercent(coverageThreshold)}</span>
              </div>
            )}
          </>
        )}
      </div>
    </GlassCard>
  );
}

export default function CourseQuizPage() {
  const { slug, quizId } = useParams({ strict: false }) as { slug: string; quizId: string };

  const { data: course, isLoading: courseLoading } = useCourseBySlug(slug);
  const { data: quiz, isLoading: quizLoading } = useStudentQuiz(quizId);
  const { data: questions = [], isLoading: questionsLoading } = useStudentQuizQuestions(quizId);
  const { data: attempts = [] } = useMyQuizAttempts(quizId);

  const createAttempt = useCreateQuizAttempt(quizId);
  const answerAttempt = useAnswerQuizAttempt();
  const submitAttempt = useSubmitQuizAttempt();

  const displayQuestions = useMemo(() => {
    const orderedQuestions = quiz?.shuffle_questions
      ? stableShuffle(questions, (question) => question.id, quizId)
      : [...questions].sort((a, b) => a.position - b.position);

    return orderedQuestions.map((question) => ({
      ...question,
      options: quiz?.shuffle_options
        ? stableShuffle(question.options, (option) => option.id, question.id)
        : [...question.options].sort((a, b) => a.position - b.position),
    }));
  }, [questions, quiz?.shuffle_options, quiz?.shuffle_questions, quizId]);

  const sessionKey = useMemo(() => {
    if (!quiz) return null;
    return [quiz.id, quiz.updated_at, ...displayQuestions.map((question) => question.id)].join(":");
  }, [displayQuestions, quiz]);

  const latestSubmittedAttempt = useMemo(
    () => attempts.find((attempt) => attempt.status === "submitted") ?? null,
    [attempts]
  );

  const completedAttempts = useMemo(
    () => attempts.filter((attempt) => attempt.status === "submitted").length,
    [attempts]
  );

  const cooldownEndsAt = useMemo(() => {
    if (!latestSubmittedAttempt?.submitted_at || !quiz?.cooldown_hours) return null;
    return new Date(new Date(latestSubmittedAttempt.submitted_at).getTime() + quiz.cooldown_hours * 60 * 60 * 1000);
  }, [latestSubmittedAttempt?.submitted_at, quiz?.cooldown_hours]);

  const cooldownActive = cooldownEndsAt ? cooldownEndsAt.getTime() > Date.now() : false;
  const noRetakesLeft = completedAttempts > 0 && quiz?.allow_retakes === false;
  const maxAttemptsReached = quiz?.max_attempts != null && completedAttempts >= quiz.max_attempts;
  const quizUnavailable = quiz?.status !== "published" || displayQuestions.length === 0;
  const canStartNewAttempt = Boolean(quiz) && !quizUnavailable && !noRetakesLeft && !maxAttemptsReached && !cooldownActive;

  const [activeIdx, setActiveIdx] = useState(0);
  const [statuses, setStatuses] = useState<QuestionStatus[]>([]);
  const [timeLeft, setTimeLeft] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [submittedAttemptId, setSubmittedAttemptId] = useState<string | null>(null);

  const autoSubmitStartedRef = useRef(false);
  const questionSeenAtRef = useRef<Record<string, number>>({});
  const sessionReady = statuses.length === displayQuestions.length && displayQuestions.length > 0;

  useEffect(() => {
    if (!sessionKey || !quiz) return;
    setActiveIdx(0);
    setStatuses(
      displayQuestions.map(() => ({
        selectedOptionId: null,
        flagged: false,
        hintViewed: false,
      }))
    );
    setTimeLeft(quiz.time_limit_seconds ?? 0);
    setSubmitting(false);
    setSubmittedAttemptId(null);
    autoSubmitStartedRef.current = false;
    questionSeenAtRef.current = {};
  }, [displayQuestions, quiz, sessionKey]);

  const resultAttemptId = submittedAttemptId ?? (!canStartNewAttempt ? latestSubmittedAttempt?.id ?? null : null);
  const { data: result, isLoading: resultLoading } = useQuizAttemptResult(resultAttemptId);

  useEffect(() => {
    const activeQuestionId = displayQuestions[activeIdx]?.id;
    if (!activeQuestionId || questionSeenAtRef.current[activeQuestionId]) return;
    questionSeenAtRef.current[activeQuestionId] = Date.now();
  }, [activeIdx, displayQuestions]);

  useEffect(() => {
    if (!quiz?.time_limit_seconds || !sessionReady || submitting || submittedAttemptId) return;
    const timerId = window.setInterval(() => {
      setTimeLeft((current) => Math.max(current - 1, 0));
    }, 1000);
    return () => window.clearInterval(timerId);
  }, [quiz?.time_limit_seconds, sessionReady, submittedAttemptId, submitting]);

  async function handleSubmit(trigger: "manual" | "timeout") {
    if (!quiz || !sessionReady || submitting || submittedAttemptId) return;

    setSubmitting(true);
    try {
      const attempt = await createAttempt.mutateAsync();

      for (const [index, question] of displayQuestions.entries()) {
        const status = statuses[index];
        const startedAt = questionSeenAtRef.current[question.id];
        const responseTimeMs = startedAt ? Math.max(Date.now() - startedAt, 0) : null;

        await answerAttempt.mutateAsync({
          attemptId: attempt.id,
          payload: {
            question_id: question.id,
            selected_option_id: status?.selectedOptionId ?? null,
            hint_used: Boolean(status?.hintViewed),
            response_time_ms: responseTimeMs,
          },
        });
      }

      const submittedAttempt = await submitAttempt.mutateAsync(attempt.id);
      setSubmittedAttemptId(submittedAttempt.id);
      if (trigger === "timeout") {
        toast.error("Time is up. Your quiz was submitted automatically.");
      }
    } catch (error) {
      toast.error((error as Error).message || "Failed to submit quiz");
    } finally {
      setSubmitting(false);
    }
  }

  useEffect(() => {
    if (!quiz?.time_limit_seconds || !sessionReady || timeLeft > 0 || submitting || submittedAttemptId) return;
    if (autoSubmitStartedRef.current) return;
    autoSubmitStartedRef.current = true;
    void handleSubmit("timeout");
  }, [handleSubmit, quiz?.time_limit_seconds, sessionReady, submittedAttemptId, submitting, timeLeft]);

  if (courseLoading || quizLoading || questionsLoading) {
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
          <h2 className="font-headline font-bold text-xl text-m3-on-surface mb-2">Quiz Not Found</h2>
          <p className="text-sm text-m3-on-surface-variant mb-6">
            The requested quiz could not be loaded for this course.
          </p>
          <Link to="/courses/$slug/learn" params={{ slug }}>
            <Button className="gradient-primary text-white rounded-xl font-bold gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Learning
            </Button>
          </Link>
        </GlassCard>
      </div>
    );
  }

  if (quizUnavailable) {
    return (
      <div className="min-h-[70vh] bg-m3-surface flex items-center justify-center p-8">
        <GlassCard className="p-10 text-center max-w-lg">
          <BookOpen className="h-10 w-10 text-m3-outline mx-auto mb-4" />
          <h2 className="font-headline font-bold text-xl text-m3-on-surface mb-2">Quiz Not Available Yet</h2>
          <p className="text-sm text-m3-on-surface-variant mb-6">
            This quiz is still being prepared or does not have published questions yet.
          </p>
          <Link to="/courses/$slug/learn" params={{ slug }}>
            <Button className="gradient-primary text-white rounded-xl font-bold gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Learning
            </Button>
          </Link>
        </GlassCard>
      </div>
    );
  }

  if ((submittedAttemptId || !canStartNewAttempt) && resultAttemptId) {
    const score = Number(result?.attempt.score_percent ?? 0);
    const passingScore = Number(quiz.passing_score_percent);
    const passed = Boolean(result?.attempt.passed);
    const attemptCountLabel = quiz.max_attempts != null ? `${completedAttempts}/${quiz.max_attempts}` : `${completedAttempts}`;

    return (
      <div className="min-h-[70vh] bg-m3-surface flex flex-col items-center justify-center p-6 sm:p-8">
        <div className="max-w-3xl w-full space-y-6">
          <GlassCard className="p-8 sm:p-10 text-center">
            {resultLoading || !result ? (
              <div className="space-y-3">
                <div className="h-24 w-24 rounded-full bg-m3-surface-container animate-pulse mx-auto" />
                <div className="h-5 rounded-full bg-m3-surface-container animate-pulse w-48 mx-auto" />
              </div>
            ) : (
              <>
                <div
                  className={cn(
                    "w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6 text-4xl font-black font-headline shadow-lg",
                    passed
                      ? "bg-gradient-to-br from-emerald-400 to-teal-500 text-white"
                      : "bg-gradient-to-br from-m3-primary to-m3-secondary text-white"
                  )}
                >
                  {Math.round(score)}%
                </div>
                <h2 className="font-headline font-extrabold text-2xl text-m3-primary mb-1">
                  {passed ? "Quiz passed" : "Quiz submitted"}
                </h2>
                <p className="text-m3-on-surface-variant text-sm mb-2">
                  {passed
                    ? `You cleared ${quiz.title} with ${Math.round(score)}%.`
                    : `You scored ${Math.round(score)}% and need ${Math.round(passingScore)}% to pass.`}
                </p>
                <p className="text-xs text-m3-outline mb-6">
                  Attempt {result.attempt.attempt_number} • Time taken {formatAttemptTime(result.attempt.time_taken_seconds)}
                </p>

                {(noRetakesLeft || maxAttemptsReached || cooldownActive) && (
                  <div className="rounded-xl bg-m3-surface-container-low px-4 py-3 text-sm text-m3-on-surface-variant mb-6">
                    {noRetakesLeft && "Retakes are disabled for this quiz."}
                    {maxAttemptsReached && ` You have used all ${quiz.max_attempts} attempts.`}
                    {cooldownActive && cooldownEndsAt && ` Next attempt available ${formatCooldown(cooldownEndsAt)}.`}
                  </div>
                )}

                <div className="flex gap-3 justify-center flex-wrap">
                  <Link to="/courses/$slug/learn" params={{ slug }}>
                    <Button variant="outline" className="rounded-xl ghost-border font-bold text-sm gap-2">
                      <ArrowLeft className="h-4 w-4" />
                      Back to Learning
                    </Button>
                  </Link>
                  {canStartNewAttempt && (
                    <Button
                      className="rounded-xl gradient-primary text-white font-bold text-sm gap-2"
                      onClick={() => {
                        setSubmittedAttemptId(null);
                        setActiveIdx(0);
                        setStatuses(
                          displayQuestions.map(() => ({
                            selectedOptionId: null,
                            flagged: false,
                            hintViewed: false,
                          }))
                        );
                        setTimeLeft(quiz.time_limit_seconds ?? 0);
                        autoSubmitStartedRef.current = false;
                        questionSeenAtRef.current = {};
                      }}
                    >
                      Retry Quiz
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </>
            )}
          </GlassCard>

          {result && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <GlassCard className="p-5">
                <span className="block text-[10px] text-m3-outline uppercase font-bold mb-1 tracking-wider">
                  Attempts Used
                </span>
                <span className="text-2xl font-black font-headline text-m3-primary">{attemptCountLabel}</span>
              </GlassCard>
              <GlassCard className="p-5">
                <span className="block text-[10px] text-m3-outline uppercase font-bold mb-1 tracking-wider">
                  Passing Score
                </span>
                <span className="text-2xl font-black font-headline text-m3-secondary">
                  {Math.round(passingScore)}%
                </span>
              </GlassCard>
              <GlassCard className="p-5">
                <span className="block text-[10px] text-m3-outline uppercase font-bold mb-1 tracking-wider">
                  Time Limit
                </span>
                <span className="text-2xl font-black font-headline text-m3-on-surface">
                  {quiz.time_limit_seconds ? formatTime(quiz.time_limit_seconds) : "None"}
                </span>
              </GlassCard>
            </div>
          )}

          {result && (
            <QuizStudyModeCard
              allowRetakes={quiz.allow_retakes}
              maxAttempts={quiz.max_attempts}
              showHints={quiz.show_hints}
              remindersEnabled={quiz.reminders_enabled}
              initialEf={quiz.initial_ef}
              minEfForUnlock={quiz.min_ef_for_unlock}
              coverageThreshold={quiz.coverage_threshold}
            />
          )}

          {result && (
            <div className="space-y-3">
              {displayQuestions.map((question, index) => {
                const answer = result.answers.find((entry) => entry.question_id === question.id);
                const selected = answer?.selected_option_id ?? null;
                const correct = question.options.find((option) => option.is_correct) ?? null;
                const selectedOption = question.options.find((option) => option.id === selected) ?? null;
                const isCorrect = Boolean(answer?.is_correct);

                return (
                  <GlassCard key={question.id} className="p-5">
                    <div className="flex items-start gap-3">
                      <div
                        className={cn(
                          "w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5 text-xs font-bold",
                          isCorrect ? "bg-emerald-100 text-emerald-700" : "bg-red-50 text-red-600"
                        )}
                      >
                        {isCorrect ? "✓" : "✗"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-m3-on-surface mb-2 leading-snug">
                          {index + 1}. {question.prompt_text}
                        </p>
                        <p className={cn("text-xs mb-1", isCorrect ? "text-emerald-600" : "text-red-500")}>
                          Your answer: {selectedOption?.option_text ?? "Not answered"}
                        </p>
                        {!isCorrect && (
                          <p className="text-xs text-m3-on-surface-variant">
                            Correct: {correct?.option_text ?? "Not available"}
                          </p>
                        )}
                        {question.explanation && (
                          <p className="text-xs text-m3-outline mt-2 leading-relaxed">{question.explanation}</p>
                        )}
                      </div>
                    </div>
                  </GlassCard>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  }

  const activeQuestion = displayQuestions[activeIdx];
  const activeStatus = statuses[activeIdx] ?? { selectedOptionId: null, flagged: false, hintViewed: false };
  const completedCount = statuses.filter((status) => status.selectedOptionId !== null).length;
  const flaggedCount = statuses.filter((status) => status.flagged).length;
  const progressPct = displayQuestions.length ? Math.round((completedCount / displayQuestions.length) * 100) : 0;
  const isLastQuestion = activeIdx === displayQuestions.length - 1;
  const isTimeLow = Boolean(quiz.time_limit_seconds) && timeLeft < 120;
  const activeSourceRefs = sourceRefsFromQuestion(activeQuestion);
  const passingScore = Math.round(Number(quiz.passing_score_percent));

  return (
    <div className="min-h-[70vh] bg-m3-surface pb-20">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
          <div className="flex items-center gap-3 flex-wrap">
            <Link to="/courses/$slug/learn" params={{ slug }}>
              <Button variant="ghost" size="sm" className="rounded-xl text-m3-on-surface-variant hover:text-m3-primary gap-1.5 text-xs font-bold px-3">
                <ArrowLeft className="h-4 w-4" />
                Learning Path
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
                  isTimeLow ? "bg-red-50 text-red-600 animate-pulse" : "bg-m3-surface-container text-m3-primary"
                )}
              >
                <Timer className="h-4 w-4" />
                {formatTime(sessionReady ? timeLeft : quiz.time_limit_seconds)}
              </div>
            ) : (
              <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-m3-surface-container text-m3-primary font-bold text-sm">
                <Clock className="h-4 w-4" />
                Untimed quiz
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
              <p className="text-m3-on-surface-variant text-base">
                Module assessment
              </p>
            </div>
            <div className="text-right shrink-0">
              <span className="block font-headline font-bold text-2xl text-m3-secondary">
                {String(activeIdx + 1).padStart(2, "0")} <span className="text-m3-outline-variant font-medium text-sm">/ {displayQuestions.length}</span>
              </span>
              <span className="text-[10px] uppercase tracking-widest font-bold text-m3-outline">
                {completedAttempts} prior attempt{completedAttempts === 1 ? "" : "s"}
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
                  LIVE QUIZ
                </Badge>
              </div>

              <div className="mb-8 pt-2">
                <span className="text-m3-secondary font-headline font-bold text-xs tracking-widest uppercase mb-3 block">
                  Question {String(activeIdx + 1).padStart(2, "0")}
                </span>
                <h2 className="text-xl sm:text-2xl font-headline font-bold text-m3-on-surface leading-snug">
                  {activeQuestion.prompt_text}
                </h2>
              </div>

              <div className="space-y-3">
                {activeQuestion.options.map((option) => {
                  const isSelected = activeStatus.selectedOptionId === option.id;
                  return (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => {
                        if (submitting) return;
                        setStatuses((current) =>
                          current.map((status, index) =>
                            index === activeIdx ? { ...status, selectedOptionId: option.id } : status
                          )
                        );
                      }}
                      className={cn(
                        "w-full text-left p-5 sm:p-6 rounded-xl flex items-center gap-5 transition-all duration-200 border-2 group/opt cursor-pointer",
                        isSelected
                          ? "bg-m3-primary-fixed/20 border-m3-primary shadow-lg shadow-m3-primary/10 ring-2 ring-m3-primary"
                          : "bg-m3-surface-container-low border-transparent hover:bg-m3-surface-container-high hover:border-m3-outline-variant/30"
                      )}
                    >
                      <span
                        className={cn(
                          "w-10 h-10 shrink-0 flex items-center justify-center rounded-xl font-bold text-sm transition-colors shadow-sm",
                          isSelected
                            ? "bg-m3-primary text-white"
                            : "bg-m3-surface-container-lowest text-m3-primary group-hover/opt:bg-m3-primary group-hover/opt:text-white"
                        )}
                      >
                        {option.option_key}
                      </span>
                      <span
                        className={cn(
                          "flex-1 text-sm sm:text-base leading-snug",
                          isSelected ? "text-m3-primary font-semibold" : "text-m3-on-surface font-medium"
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
                disabled={activeIdx === 0 || submitting}
                className="font-bold text-m3-primary hover:bg-m3-primary-fixed/30 rounded-xl gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Previous
              </Button>

              <div className="flex items-center gap-3 flex-wrap justify-end">
                <Button
                  variant="ghost"
                  onClick={() => {
                    setStatuses((current) =>
                      current.map((status, index) =>
                        index === activeIdx ? { ...status, flagged: !status.flagged } : status
                      )
                    );
                  }}
                  disabled={submitting}
                  className={cn(
                    "font-bold rounded-xl gap-2 text-sm",
                    activeStatus.flagged
                      ? "text-amber-600 bg-amber-50 hover:bg-amber-100"
                      : "text-m3-outline hover:text-m3-on-surface"
                  )}
                >
                  <Flag className="h-4 w-4" />
                  {activeStatus.flagged ? "Unflag" : "Mark for Review"}
                </Button>

                <Button
                  onClick={() => {
                    if (isLastQuestion) {
                      void handleSubmit("manual");
                      return;
                    }
                    setActiveIdx((current) => Math.min(displayQuestions.length - 1, current + 1));
                  }}
                  disabled={submitting}
                  className="gradient-primary text-white font-bold rounded-xl gap-2 shadow-ai-glow px-6 py-3 h-auto hover:opacity-90 active:scale-95 transition-all"
                >
                  {submitting ? "Submitting..." : isLastQuestion ? "Submit Quiz" : "Save & Next"}
                  <ArrowRight className="h-4 w-4" />
                </Button>
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
                  <h4 className="font-headline font-bold text-m3-primary text-sm">Quiz Guide</h4>
                  <p className="text-[10px] text-m3-outline uppercase font-bold tracking-wider">Student View</p>
                </div>
              </div>

              {quiz.show_hints && activeQuestion.hint_text ? (
                activeStatus.hintViewed ? (
                  <p className="text-sm text-m3-on-surface-variant leading-relaxed">
                    <span className="text-m3-secondary font-bold">Hint: </span>
                    {activeQuestion.hint_text}
                  </p>
                ) : (
                  <Button
                    variant="outline"
                    className="w-full justify-center rounded-xl ghost-border font-semibold"
                    onClick={() => {
                      setStatuses((current) =>
                        current.map((status, index) =>
                          index === activeIdx ? { ...status, hintViewed: true } : status
                        )
                      );
                    }}
                  >
                    Reveal Hint
                  </Button>
                )
              ) : (
                <p className="text-sm text-m3-on-surface-variant leading-relaxed">
                  Focus on the strongest answer and use the source material if you need a refresher.
                </p>
              )}
            </GlassCard>

            {activeSourceRefs.length > 0 && (
              <div className="bg-m3-surface-container-low rounded-xl p-5">
                <h4 className="text-[10px] font-bold text-m3-outline uppercase tracking-widest mb-4">
                  Source Material
                </h4>
                <div className="space-y-3">
                  {activeSourceRefs.slice(0, 3).map((ref, index) => (
                    <div key={`${ref.material_title ?? "ref"}-${index}`} className="flex gap-3 items-start">
                      <div className="w-12 h-12 shrink-0 rounded-xl bg-gradient-to-br from-m3-primary to-m3-secondary flex items-center justify-center">
                        <BookOpen className="h-5 w-5 text-white" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-m3-on-surface mb-0.5 leading-snug">
                          {ref.material_title ?? "Reference material"}
                        </p>
                        <p className="text-xs text-m3-on-surface-variant">{formatSourceRef(ref)}</p>
                      </div>
                    </div>
                  ))}
                  <Link
                    to="/courses/$slug/learn"
                    params={{ slug }}
                    className="text-xs font-bold text-m3-secondary flex items-center gap-1 hover:underline"
                  >
                    Review lesson materials
                    <ExternalLink className="h-3 w-3" />
                  </Link>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white rounded-xl p-4 shadow-sm">
                <span className="block text-[10px] text-m3-outline uppercase font-bold mb-1 tracking-wider">
                  Answered
                </span>
                <span className="text-xl font-black font-headline text-m3-primary">
                  {completedCount}
                  <span className="text-sm text-m3-outline-variant font-medium">/{displayQuestions.length}</span>
                </span>
              </div>
              <div className="bg-white rounded-xl p-4 shadow-sm">
                <span className="block text-[10px] text-m3-outline uppercase font-bold mb-1 tracking-wider">
                  Flagged
                </span>
                <span className="text-xl font-black font-headline text-amber-500">{flaggedCount}</span>
              </div>
              <div className="bg-white rounded-xl p-4 shadow-sm col-span-2">
                <span className="block text-[10px] text-m3-outline uppercase font-bold mb-1 tracking-wider">
                  Pass Mark
                </span>
                <span className="text-xl font-black font-headline text-m3-secondary">{passingScore}%</span>
              </div>
            </div>

            <QuizStudyModeCard
              allowRetakes={quiz.allow_retakes}
              maxAttempts={quiz.max_attempts}
              showHints={quiz.show_hints}
              remindersEnabled={quiz.reminders_enabled}
              initialEf={quiz.initial_ef}
              minEfForUnlock={quiz.min_ef_for_unlock}
              coverageThreshold={quiz.coverage_threshold}
            />
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-m3-outline-variant/15">
          <h4 className="text-xs font-bold text-m3-outline uppercase tracking-widest mb-5 text-center">
            Question Overview
          </h4>
          <div className="flex flex-wrap justify-center gap-2.5">
            {displayQuestions.map((question, index) => {
              const status = statuses[index] ?? { selectedOptionId: null, flagged: false, hintViewed: false };
              const state = questionState(index, activeIdx, status);
              return (
                <button
                  key={question.id}
                  type="button"
                  onClick={() => setActiveIdx(index)}
                  className={cn(
                    "w-10 h-10 rounded-xl font-bold text-sm transition-all duration-150 hover:scale-110 relative cursor-pointer",
                    state === "completed" && "bg-m3-primary text-white shadow-md",
                    state === "active" && "bg-white text-m3-primary ring-2 ring-m3-primary shadow-md",
                    state === "flagged" && "bg-amber-100 text-amber-700 ring-2 ring-amber-400",
                    state === "pending" && "bg-m3-surface-container-high text-m3-outline hover:bg-m3-surface-container-highest"
                  )}
                >
                  {index + 1}
                  {state === "flagged" && (
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
