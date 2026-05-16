import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "@tanstack/react-router";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Eye,
  HelpCircle,
  Loader2,
  Plus,
  Save,
  Trash2,
  Upload,
} from "lucide-react";
import { toast } from "sonner";

import { AIInsightChip } from "@/components/ui/ai-insight-chip";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  useCreateQuizQuestion,
  useDeleteQuiz,
  usePatchQuiz,
  usePublishQuiz,
  useQuiz,
  useQuizQuestions,
  useTeacherCourseById,
  useTeacherCourseContent,
} from "@/lib/api/hooks/use-teacher-api";
import type { QuizQuestionRead, QuizRead } from "@/lib/api/types/teacher";
import { cn } from "@/lib/utils";
import {
  QuizGenerationPanel,
  QuizQuestionReviewCard,
} from "@/routes/teacher/module-manage";

/* ───────────────── Tabs ───────────────── */

type TabKey = "questions" | "settings" | "preview";

const TABS: ReadonlyArray<{ key: TabKey; label: string }> = [
  { key: "questions", label: "Questions" },
  { key: "settings", label: "Settings" },
  { key: "preview", label: "Preview" },
];

/* ───────────────── Settings draft helpers ───────────────── */

interface SettingsDraft {
  title: string;
  description: string;
  time_limit_minutes: string;
  passing_score_percent: number;
  max_attempts: string;
  cooldown_hours: string;
  initial_ef: string;
  min_ef_for_unlock: string;
  coverage_threshold: string;
  allow_retakes: boolean;
  shuffle_questions: boolean;
  shuffle_options: boolean;
  show_hints: boolean;
  reminders_enabled: boolean;
}

function toDraftString(value: string | number | null | undefined) {
  return value == null ? "" : String(value);
}

function integerOrNull(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? Math.round(parsed) : null;
}

function decimalOrNull(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  return Number.isFinite(Number(trimmed)) ? trimmed : null;
}

function draftFromQuiz(quiz: QuizRead): SettingsDraft {
  const passingNum = Number(quiz.passing_score_percent ?? 70);
  return {
    title: quiz.title ?? "",
    description: quiz.description ?? "",
    time_limit_minutes:
      quiz.time_limit_seconds == null ? "" : String(Math.max(1, Math.round(quiz.time_limit_seconds / 60))),
    passing_score_percent: Number.isFinite(passingNum)
      ? Math.max(0, Math.min(100, Math.round(passingNum)))
      : 70,
    max_attempts: toDraftString(quiz.max_attempts),
    cooldown_hours: toDraftString(quiz.cooldown_hours),
    initial_ef: toDraftString(quiz.initial_ef),
    min_ef_for_unlock: toDraftString(quiz.min_ef_for_unlock),
    coverage_threshold: toDraftString(quiz.coverage_threshold),
    allow_retakes: quiz.allow_retakes,
    shuffle_questions: quiz.shuffle_questions,
    shuffle_options: quiz.shuffle_options,
    show_hints: quiz.show_hints,
    reminders_enabled: quiz.reminders_enabled,
  };
}

/* ───────────────── Page ───────────────── */

export default function QuizManagePage() {
  const navigate = useNavigate();
  const { courseId, quizId } = useParams({ strict: false }) as {
    courseId: string;
    quizId: string;
  };

  const { data: course } = useTeacherCourseById(courseId);
  const { data: quiz, isLoading: quizLoading } = useQuiz(quizId);
  const { data: content, isLoading: contentLoading } = useTeacherCourseContent(courseId);
  const { data: questions = [], isLoading: questionsLoading } = useQuizQuestions(quizId);

  const courseModule = useMemo(
    () => content?.modules.find((entry) => entry.id === quiz?.module_id),
    [content, quiz?.module_id],
  );

  const deleteQuiz = useDeleteQuiz(courseId);
  const publishQuiz = usePublishQuiz();
  const patchQuiz = usePatchQuiz(courseId);
  const createQuestion = useCreateQuizQuestion();

  const [tab, setTab] = useState<TabKey>("questions");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [draft, setDraft] = useState<SettingsDraft | null>(null);

  useEffect(() => {
    if (quiz) setDraft(draftFromQuiz(quiz));
  }, [quiz]);

  if (quizLoading || contentLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-m3-secondary" />
      </div>
    );
  }

  if (!quiz || !courseModule) {
    return (
      <div className="text-center py-24 text-m3-on-surface-variant space-y-4">
        <div className="flex justify-center">
          <div className="h-12 w-12 rounded-2xl bg-violet-100 text-violet-700 flex items-center justify-center">
            <HelpCircle className="h-6 w-6" />
          </div>
        </div>
        <div>
          <p className="font-headline font-bold text-m3-on-surface">Quiz not found</p>
          <p className="text-sm mt-1">The requested quiz could not be loaded for this course.</p>
        </div>
        <Link to="/teacher/courses/$courseId" params={{ courseId }} className="inline-flex">
          <Button variant="outline" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to course
          </Button>
        </Link>
      </div>
    );
  }

  const moduleId = courseModule.id;
  const isPublished = quiz.status === "published";
  const publishDisabled =
    publishQuiz.isPending || isPublished || questions.length === 0;

  function returnToModule() {
    void navigate({
      to: "/teacher/courses/$courseId/modules/$moduleId",
      params: { courseId, moduleId },
    });
  }

  async function handleDelete() {
    try {
      await deleteQuiz.mutateAsync(quizId);
      toast.success("Quiz deleted");
      returnToModule();
    } catch (err: unknown) {
      toast.error((err as Error).message || "Failed to delete quiz");
    } finally {
      setConfirmDelete(false);
    }
  }

  async function handlePublish() {
    if (publishDisabled) return;
    try {
      await publishQuiz.mutateAsync(quizId);
      toast.success("Quiz published to the module");
    } catch (err: unknown) {
      toast.error((err as Error).message || "Failed to publish quiz");
    }
  }

  async function handleAddQuestion() {
    try {
      await createQuestion.mutateAsync({
        quizId,
        payload: {
          question_type: "mcq",
          prompt_text: "Untitled question",
          explanation: "Add an explanation for the correct answer.",
          difficulty: "medium",
          bloom_level: "understand",
          options: [
            { option_key: "A", option_text: "Option A", is_correct: true },
            { option_key: "B", option_text: "Option B", is_correct: false },
            { option_key: "C", option_text: "Option C", is_correct: false },
            { option_key: "D", option_text: "Option D", is_correct: false },
          ],
        },
      });
      toast.success("Question added");
    } catch (err: unknown) {
      toast.error((err as Error).message || "Failed to add question");
    }
  }

  async function handleSaveSettings(e: React.FormEvent) {
    e.preventDefault();
    if (!draft) return;
    if (!draft.title.trim()) {
      toast.error("Quiz title is required");
      return;
    }
    const minutesRaw = draft.time_limit_minutes.trim();
    const timeLimitSeconds = minutesRaw
      ? Math.max(0, Math.round(Number(minutesRaw) * 60))
      : null;
    try {
      await patchQuiz.mutateAsync({
        quizId,
        payload: {
          title: draft.title.trim(),
          description: draft.description.trim() || null,
          time_limit_seconds: timeLimitSeconds,
          passing_score_percent: String(draft.passing_score_percent),
          max_attempts: integerOrNull(draft.max_attempts),
          cooldown_hours: integerOrNull(draft.cooldown_hours),
          initial_ef: decimalOrNull(draft.initial_ef),
          min_ef_for_unlock: decimalOrNull(draft.min_ef_for_unlock),
          coverage_threshold: decimalOrNull(draft.coverage_threshold),
          allow_retakes: draft.allow_retakes,
          shuffle_questions: draft.shuffle_questions,
          shuffle_options: draft.shuffle_options,
          show_hints: draft.show_hints,
          reminders_enabled: draft.reminders_enabled,
        },
      });
      toast.success("Quiz settings saved");
    } catch (err: unknown) {
      toast.error((err as Error).message || "Failed to save quiz settings");
    }
  }

  return (
    <div className="space-y-6 pb-12 max-w-[1500px] mx-auto">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-xs text-m3-on-surface-variant flex-wrap">
        <Link to="/teacher/courses" className="hover:text-m3-primary transition-colors">
          My Courses
        </Link>
        <ArrowRight className="h-3 w-3" />
        <Link
          to="/teacher/courses/$courseId"
          params={{ courseId }}
          className="hover:text-m3-primary transition-colors truncate max-w-[160px]"
        >
          {course?.title ?? "…"}
        </Link>
        <ArrowRight className="h-3 w-3" />
        <Link
          to="/teacher/courses/$courseId/modules/$moduleId"
          params={{ courseId, moduleId }}
          className="hover:text-m3-primary transition-colors truncate max-w-[160px]"
        >
          {courseModule.title}
        </Link>
        <ArrowRight className="h-3 w-3" />
        <span className="text-m3-on-surface font-medium truncate max-w-[220px]">
          {quiz.title}
        </span>
      </div>

      {/* Page header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex items-start gap-3 min-w-0 flex-1">
          <Link
            to="/teacher/courses/$courseId/modules/$moduleId"
            params={{ courseId, moduleId }}
          >
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 mt-1 shrink-0"
              title="Back to module"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>

          <div className="min-w-0 flex-1 space-y-2">
            <h1 className="text-3xl lg:text-4xl font-extrabold font-headline tracking-tight text-gradient-primary leading-tight">
              {quiz.title}
            </h1>
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="border border-m3-outline-variant/30 bg-m3-surface-container-low text-m3-on-surface-variant rounded-full text-[11px] font-bold px-2.5 py-1">
                {questions.length} question{questions.length !== 1 ? "s" : ""}
              </Badge>
              {isPublished ? (
                <Badge className="border-0 bg-emerald-100 text-emerald-700 text-[11px] font-bold gap-1.5 rounded-full px-2.5 py-1">
                  <CheckCircle2 className="h-3 w-3" />
                  Published
                </Badge>
              ) : (
                <Badge className="border-0 bg-amber-50 text-amber-700 text-[11px] font-bold rounded-full px-2.5 py-1">
                  Draft
                </Badge>
              )}
              <AIInsightChip>AI Quiz Editor</AIInsightChip>
            </div>
            {quiz.description && (
              <p className="text-sm text-m3-on-surface-variant max-w-2xl leading-relaxed">
                {quiz.description}
              </p>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 flex-wrap shrink-0">
          {course?.slug && (
            <Link
              to="/courses/$slug/quiz/$quizId"
              params={{ slug: course.slug, quizId }}
            >
              <Button variant="outline" className="gap-2" type="button">
                <Eye className="h-4 w-4" />
                Preview as Student
              </Button>
            </Link>
          )}
          <Button
            type="button"
            disabled={publishDisabled}
            onClick={handlePublish}
            className={cn(
              "gap-2 border-0 shadow-glass",
              isPublished
                ? "bg-emerald-600 text-white hover:bg-emerald-600 cursor-default"
                : "gradient-primary text-white hover:shadow-ai-glow",
            )}
            title={
              questions.length === 0
                ? "Add at least one question before publishing"
                : isPublished
                  ? "Already published"
                  : "Publish this quiz to the module"
            }
          >
            {publishQuiz.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : isPublished ? (
              <CheckCircle2 className="h-4 w-4" />
            ) : (
              <Upload className="h-4 w-4" />
            )}
            {isPublished ? "Published" : "Publish Quiz"}
          </Button>
          <Button
            type="button"
            variant="outline"
            className="gap-2 border-red-200 text-red-700 hover:bg-red-50 hover:text-red-700"
            onClick={() => setConfirmDelete(true)}
            disabled={deleteQuiz.isPending}
            title="Delete this quiz, its questions, attempts, and curriculum entry"
          >
            <Trash2 className="h-4 w-4" />
            Delete
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-m3-surface-container-low rounded-2xl p-1 inline-flex gap-1 border border-m3-outline-variant/20 shadow-glass">
        {TABS.map((entry) => {
          const active = entry.key === tab;
          return (
            <button
              key={entry.key}
              type="button"
              onClick={() => setTab(entry.key)}
              aria-pressed={active}
              className={cn(
                "px-4 py-2 rounded-xl text-sm font-bold transition-all cursor-pointer",
                active
                  ? "bg-white text-m3-primary shadow-sm"
                  : "text-m3-on-surface-variant hover:text-m3-primary/80",
              )}
            >
              {entry.label}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      {tab === "questions" && (
        <QuestionsTab
          questions={questions}
          questionsLoading={questionsLoading}
          onAddQuestion={handleAddQuestion}
          addPending={createQuestion.isPending}
          courseModule={courseModule}
          courseId={courseId}
          quizId={quizId}
        />
      )}

      {tab === "settings" && draft && (
        <SettingsTab
          draft={draft}
          setDraft={setDraft}
          onSubmit={handleSaveSettings}
          saving={patchQuiz.isPending}
        />
      )}

      {tab === "preview" && (
        <PreviewTab quiz={quiz} questions={questions} />
      )}

      {/* Delete confirm modal */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-2xl bg-m3-surface p-6 shadow-xl space-y-4">
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-xl bg-red-100 text-red-700 flex items-center justify-center shrink-0">
                <Trash2 className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <h2 className="font-headline font-bold text-base text-m3-on-surface">
                  Delete this quiz?
                </h2>
                <p className="text-sm text-m3-on-surface-variant">
                  This permanently removes the quiz{" "}
                  <span className="font-semibold">{quiz.title}</span>, its
                  questions, attempts, and the curriculum entry in the module.
                  This cannot be undone.
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setConfirmDelete(false)}
                disabled={deleteQuiz.isPending}
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleDelete}
                disabled={deleteQuiz.isPending}
                className="bg-red-600 text-white hover:bg-red-700 border-0 gap-2"
              >
                {deleteQuiz.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ───────────────── Questions Tab ───────────────── */

function QuestionsTab({
  questions,
  questionsLoading,
  onAddQuestion,
  addPending,
  courseModule,
  courseId,
  quizId,
}: {
  questions: QuizQuestionRead[];
  questionsLoading: boolean;
  onAddQuestion: () => void | Promise<void>;
  addPending: boolean;
  courseModule: NonNullable<
    ReturnType<typeof useTeacherCourseContent>["data"]
  >["modules"][number];
  courseId: string;
  quizId: string;
}) {
  const pendingCount = questions.filter((q) => q.review_status !== "approved").length;

  return (
    <div className="grid grid-cols-12 gap-6">
      {/* Question editor list */}
      <div className="col-span-12 lg:col-span-8 space-y-4">
        {questions.length > 0 && pendingCount > 0 && (
          <div className="flex items-center gap-2 rounded-xl bg-amber-50 border border-amber-100 px-3 py-2 text-xs text-amber-800">
            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
            <span>
              <strong>{pendingCount}</strong> question{pendingCount !== 1 ? "s" : ""} still
              pending review. Approve them before publishing.
            </span>
          </div>
        )}

        {questionsLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((idx) => (
              <div key={idx} className="h-32 rounded-2xl bg-m3-surface-container animate-pulse" />
            ))}
          </div>
        ) : questions.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-m3-outline-variant/30 bg-m3-surface-container-lowest p-10 text-center space-y-3">
            <HelpCircle className="h-10 w-10 text-m3-outline-variant mx-auto" />
            <div>
              <p className="font-headline font-bold text-m3-on-surface">
                No questions yet
              </p>
              <p className="text-sm text-m3-on-surface-variant mt-1 max-w-md mx-auto">
                Add a question manually below, or use the AI generator on the right
                to draft a batch from your ready lesson materials.
              </p>
            </div>
          </div>
        ) : (
          questions.map((question) => (
            <QuizQuestionReviewCard key={question.id} question={question} />
          ))
        )}

        <button
          type="button"
          onClick={onAddQuestion}
          disabled={addPending}
          className="w-full flex items-center justify-center gap-2 border-2 border-dashed border-m3-outline-variant/40 rounded-2xl px-6 py-4 text-sm font-bold text-m3-on-surface-variant hover:border-m3-primary hover:text-m3-primary hover:bg-m3-primary/5 transition-all disabled:opacity-60 cursor-pointer"
        >
          {addPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Plus className="h-4 w-4" />
          )}
          Add Question
        </button>
      </div>

      {/* AI generator side panel */}
      <div className="col-span-12 lg:col-span-4">
        <div className="lg:sticky lg:top-6">
          <QuizGenerationPanel
            module={courseModule}
            courseId={courseId}
            targetQuizId={quizId}
            compact
            showReview={false}
          />
        </div>
      </div>
    </div>
  );
}

/* ───────────────── Settings Tab ───────────────── */

function SettingsTab({
  draft,
  setDraft,
  onSubmit,
  saving,
}: {
  draft: SettingsDraft;
  setDraft: React.Dispatch<React.SetStateAction<SettingsDraft | null>>;
  onSubmit: (e: React.FormEvent) => void;
  saving: boolean;
}) {
  function update<K extends keyof SettingsDraft>(key: K, value: SettingsDraft[K]) {
    setDraft((current) => (current ? { ...current, [key]: value } : current));
  }

  return (
    <form
      onSubmit={onSubmit}
      className="bg-m3-surface-container-lowest border border-m3-outline-variant/20 rounded-2xl p-6 lg:p-8 space-y-8 shadow-glass"
    >
      {/* Basics */}
      <SettingsSection
        title="Basics"
        description="Name and describe this quiz so students recognize it."
      >
        <Field label="Quiz Title">
          <Input
            value={draft.title}
            onChange={(e) => update("title", e.target.value)}
            placeholder="Enter quiz title…"
            className="bg-m3-surface text-sm"
          />
        </Field>
        <Field label="Description">
          <textarea
            value={draft.description}
            onChange={(e) => update("description", e.target.value)}
            rows={3}
            placeholder="Briefly describe what this quiz assesses…"
            className="w-full rounded-xl border border-m3-outline-variant/20 bg-m3-surface px-3 py-2.5 text-sm text-m3-on-surface resize-none focus:outline-none focus:ring-2 focus:ring-m3-secondary/30"
          />
        </Field>
      </SettingsSection>

      {/* Scoring & pacing */}
      <SettingsSection title="Scoring & Pacing">
        <Field
          label={
            <span className="flex items-center justify-between">
              <span>Passing Score</span>
              <span className="text-m3-primary font-extrabold text-sm">
                {draft.passing_score_percent}%
              </span>
            </span>
          }
        >
          <input
            type="range"
            min={0}
            max={100}
            step={5}
            value={draft.passing_score_percent}
            onChange={(e) => update("passing_score_percent", Number(e.target.value))}
            className="w-full h-2 rounded-full cursor-pointer accent-[var(--m3-primary)]"
          />
        </Field>
        <Field
          label="Time Limit (minutes)"
          hint="Leave blank for no time limit."
        >
          <Input
            type="number"
            min={1}
            max={180}
            value={draft.time_limit_minutes}
            onChange={(e) => update("time_limit_minutes", e.target.value)}
            placeholder="e.g. 30"
            className="bg-m3-surface text-sm w-40"
          />
        </Field>
      </SettingsSection>

      {/* Attempts */}
      <SettingsSection title="Attempts">
        <ToggleRow
          label="Allow Retakes"
          description="Let students re-attempt the quiz after submitting."
          value={draft.allow_retakes}
          onChange={(v) => update("allow_retakes", v)}
        />
        {draft.allow_retakes && (
          <div className="ml-1 pl-4 border-l-2 border-m3-primary/30 grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
            <Field label="Max Attempts" hint="Blank = unlimited.">
              <Input
                type="number"
                min={1}
                value={draft.max_attempts}
                onChange={(e) => update("max_attempts", e.target.value)}
                placeholder="e.g. 3"
                className="bg-m3-surface text-sm"
              />
            </Field>
            <Field label="Cooldown (hours)" hint="Wait between attempts.">
              <Input
                type="number"
                min={0}
                value={draft.cooldown_hours}
                onChange={(e) => update("cooldown_hours", e.target.value)}
                placeholder="Optional"
                className="bg-m3-surface text-sm"
              />
            </Field>
          </div>
        )}
      </SettingsSection>

      {/* Behavior */}
      <SettingsSection title="Behavior">
        <ToggleRow
          label="Shuffle Questions"
          description="Randomize question order for each attempt."
          value={draft.shuffle_questions}
          onChange={(v) => update("shuffle_questions", v)}
        />
        <ToggleRow
          label="Shuffle Options"
          description="Randomize answer option order for each question."
          value={draft.shuffle_options}
          onChange={(v) => update("shuffle_options", v)}
        />
        <ToggleRow
          label="Show Hints"
          description="Let students reveal AI cognitive guide hints during the quiz."
          value={draft.show_hints}
          onChange={(v) => update("show_hints", v)}
        />
        <ToggleRow
          label="Review Reminders"
          description="Notify students when it's time to revisit this quiz via spaced repetition."
          value={draft.reminders_enabled}
          onChange={(v) => update("reminders_enabled", v)}
        />
      </SettingsSection>

      {/* Adaptive review */}
      <SettingsSection
        title="Adaptive Review (Spaced Repetition)"
        description="Tune the SM2-style mastery scheduling stored on the backend. Range 1.3 – 5.0."
      >
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Field label="Initial EF">
            <Input
              type="number"
              min={1.3}
              max={5.0}
              step={0.1}
              value={draft.initial_ef}
              onChange={(e) => update("initial_ef", e.target.value)}
              placeholder="2.50"
              className="bg-m3-surface text-sm"
            />
          </Field>
          <Field label="Unlock EF Floor">
            <Input
              type="number"
              min={1.3}
              max={5.0}
              step={0.1}
              value={draft.min_ef_for_unlock}
              onChange={(e) => update("min_ef_for_unlock", e.target.value)}
              placeholder="2.30"
              className="bg-m3-surface text-sm"
            />
          </Field>
          <Field label="Coverage Threshold %">
            <Input
              type="number"
              min={0}
              max={100}
              step={1}
              value={draft.coverage_threshold}
              onChange={(e) => update("coverage_threshold", e.target.value)}
              placeholder="85"
              className="bg-m3-surface text-sm"
            />
          </Field>
        </div>
      </SettingsSection>

      <div className="flex justify-end gap-2 pt-4 border-t border-m3-outline-variant/20">
        <Button
          type="submit"
          disabled={saving}
          className="gap-2 gradient-primary text-white border-0 hover:shadow-ai-glow"
        >
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          Save Settings
        </Button>
      </div>
    </form>
  );
}

function SettingsSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-4">
      <div className="space-y-1">
        <h3 className="font-headline font-extrabold text-base text-m3-on-surface">
          {title}
        </h3>
        {description && (
          <p className="text-xs text-m3-on-surface-variant">{description}</p>
        )}
      </div>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: React.ReactNode;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-bold uppercase tracking-widest text-m3-on-surface-variant">
        {label}
      </label>
      {children}
      {hint && <p className="text-[11px] text-m3-on-surface-variant">{hint}</p>}
    </div>
  );
}

function ToggleRow({
  label,
  description,
  value,
  onChange,
}: {
  label: string;
  description: string;
  value: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        <p className="text-sm font-bold text-m3-on-surface">{label}</p>
        <p className="text-xs text-m3-on-surface-variant mt-0.5">{description}</p>
      </div>
      <button
        type="button"
        onClick={() => onChange(!value)}
        aria-pressed={value}
        className={cn(
          "relative w-11 h-6 rounded-full transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-m3-primary/50 shrink-0 cursor-pointer",
          value ? "bg-m3-primary" : "bg-m3-surface-container-high",
        )}
      >
        <span
          className={cn(
            "absolute top-1 w-4 h-4 rounded-full shadow-sm transition-all duration-200",
            value ? "left-6 bg-white" : "left-1 bg-slate-400",
          )}
        />
      </button>
    </div>
  );
}

/* ───────────────── Preview Tab ───────────────── */

function PreviewTab({
  quiz,
  questions,
}: {
  quiz: QuizRead;
  questions: QuizQuestionRead[];
}) {
  return (
    <div className="bg-m3-surface-container-lowest border border-m3-outline-variant/20 rounded-2xl p-6 lg:p-8 space-y-6 shadow-glass">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h2 className="font-headline font-extrabold text-xl text-m3-on-surface">
            Student Preview
          </h2>
          <p className="text-sm text-m3-on-surface-variant mt-1">
            {quiz.title} — read-only render of how this quiz appears to students.
          </p>
        </div>
        <Badge className="border border-m3-outline-variant/40 bg-m3-surface-container-low text-m3-on-surface-variant rounded-full text-[11px] font-medium px-3 py-1 self-start sm:self-auto">
          Read-only
        </Badge>
      </div>

      {questions.length === 0 ? (
        <div className="text-center py-16 text-m3-on-surface-variant space-y-1">
          <HelpCircle className="h-8 w-8 mx-auto text-m3-outline-variant" />
          <p className="text-base font-bold">No questions yet</p>
          <p className="text-sm">
            Add questions in the Questions tab or use the AI Generator.
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          {questions.map((question, idx) => (
            <PreviewQuestion key={question.id} index={idx} question={question} />
          ))}
        </div>
      )}
    </div>
  );
}

function PreviewQuestion({
  index,
  question,
}: {
  index: number;
  question: QuizQuestionRead;
}) {
  const hasOptions =
    question.question_type === "mcq" && question.options.length > 0;

  return (
    <div className="rounded-2xl bg-m3-surface-container-low border border-m3-outline-variant/15 p-5 space-y-3">
      <div className="flex items-start gap-3">
        <span className="shrink-0 h-7 w-7 rounded-full gradient-primary text-white flex items-center justify-center text-xs font-extrabold">
          {index + 1}
        </span>
        <p className="text-sm font-semibold text-m3-on-surface leading-relaxed">
          {question.prompt_text || (
            <span className="italic text-m3-on-surface-variant">
              (No question text)
            </span>
          )}
        </p>
      </div>

      {hasOptions && (
        <div className="space-y-2 pl-10">
          {question.options.map((opt) => (
            <div
              key={opt.id}
              className={cn(
                "flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm",
                opt.is_correct
                  ? "border-2 border-emerald-300 bg-emerald-50/60 text-m3-on-surface font-medium"
                  : "border border-m3-outline-variant/20 bg-m3-surface text-m3-on-surface",
              )}
            >
              <span className="font-bold text-m3-on-surface-variant">
                {opt.option_key}.
              </span>
              <span className="flex-1">
                {opt.option_text || (
                  <span className="italic text-m3-on-surface-variant">
                    (No option text)
                  </span>
                )}
              </span>
              {opt.is_correct && (
                <span className="text-[10px] font-bold uppercase tracking-wide text-emerald-700">
                  ✓ Correct
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      {question.explanation && (
        <div className="pl-10">
          <p className="text-xs text-m3-on-surface-variant bg-m3-surface-container rounded-xl px-3 py-2 italic">
            <span className="font-bold not-italic">Explanation: </span>
            {question.explanation}
          </p>
        </div>
      )}
    </div>
  );
}
