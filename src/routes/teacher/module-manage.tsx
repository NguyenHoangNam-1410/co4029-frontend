import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "@tanstack/react-router";
import {
  ArrowLeft, ArrowRight, Video, HelpCircle, BookOpen,
  GripVertical, Pencil, Check, Loader2, Plus, Save,
  ChevronDown, ChevronRight, Trash2, Sparkles, CheckCircle,
  AlertCircle, FileText, Brain, EyeOff, Workflow, Network,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  useTeacherCourseById,
  useTeacherCourseContent,
  useCreateQuiz,
  useCreateQuizQuestion,
  usePatchQuiz,
  useUpdateModule,
  useCreateLesson,
  useReorderModuleItems,
  useDeleteModuleItem,
  useGenerateQuiz,
  useGenerationRun,
  usePatchQuizQuestion,
  useDeleteQuizQuestion,
  usePublishQuiz,
  useQuiz,
  useQuizQuestions,
  useTeacherProcessingSummary,
} from "@/lib/api/hooks/use-teacher-api";
import type {
  CourseContentItem,
  CourseContentLesson,
  CourseContentModule,
} from "@/lib/api/types/common";
import type { GenerationRun, QuizQuestionOptionRead, QuizQuestionRead, QuizRead } from "@/lib/api/types/teacher";
import { cn } from "@/lib/utils";

const LESSON_TYPE_CONFIG: Record<string, {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge: string;
}> = {
  video:    { label: "Video",    icon: Video,      badge: "bg-blue-50 text-blue-700" },
  reading:  { label: "Reading",  icon: BookOpen,   badge: "bg-emerald-50 text-emerald-700" },
};

const QUIZ_ITEM_CONFIG = { label: "Quiz", icon: HelpCircle, badge: "bg-violet-50 text-violet-700" };

const ADD_PILL_CLS =
  "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-m3-on-surface-variant " +
  "bg-m3-surface-container-lowest border border-m3-outline-variant/20 " +
  "hover:bg-m3-primary-fixed hover:text-m3-primary hover:border-m3-primary/20 transition-colors cursor-pointer";

const DIFFICULTIES = ["easy", "medium", "hard", "mixed"] as const;
const BLOOM_LEVELS = ["remember", "understand", "apply", "analyze", "evaluate", "create"] as const;

interface QuizSettingsDraft {
  title: string;
  description: string;
  time_limit_seconds: string;
  passing_score_percent: string;
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

function integerOrNull(value: string) {
  const trimmed = value.trim();
  return trimmed ? Number(trimmed) : null;
}

function decimalOrNull(value: string) {
  const trimmed = value.trim();
  return trimmed || null;
}

function quizDraftFromQuiz(quiz: QuizRead): QuizSettingsDraft {
  return {
    title: quiz.title,
    description: quiz.description ?? "",
    time_limit_seconds: toDraftString(quiz.time_limit_seconds),
    passing_score_percent: toDraftString(quiz.passing_score_percent),
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

function configString(config: Record<string, unknown> | undefined, key: string) {
  const value = config?.[key];
  return typeof value === "string" ? value : null;
}

function configNumber(config: Record<string, unknown> | undefined, key: string) {
  const value = config?.[key];
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function configRecord(config: Record<string, unknown> | undefined, key: string): Record<string, unknown> | null {
  const value = config?.[key];
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

interface PipelineMeta {
  retrieval: {
    chunkCount: number | null;
    strategy: string | null;
  };
  kg: {
    enabled: boolean;
    conceptCount: number;
    prerequisiteCount: number;
    relatedCount: number;
    topConcepts: string[];
  };
  ideation: {
    requested: number | null;
    received: number | null;
    used: number | null;
  };
  generation: {
    requested: number | null;
    received: number | null;
  };
  validation: {
    ran: boolean;
    accepted: number | null;
    rejectedCount: number;
    rejectedReasons: Array<{ position: number; reason: string | null }>;
  };
  mode: string | null;
}

function extractPipelineMeta(run: GenerationRun | undefined): PipelineMeta | null {
  if (!run?.config_json) return null;
  const config = run.config_json as Record<string, unknown>;
  const retrieval = configRecord(config, "retrieval");
  const kg = configRecord(config, "kg");
  const pipeline = configRecord(config, "pipeline");
  if (!retrieval && !kg && !pipeline) return null;

  const ideation = configRecord(pipeline ?? undefined, "ideation");
  const generation = configRecord(pipeline ?? undefined, "generation");
  const validation = configRecord(pipeline ?? undefined, "validation");
  const rejectedRaw = validation?.rejected;
  const rejectedReasons: Array<{ position: number; reason: string | null }> =
    Array.isArray(rejectedRaw)
      ? rejectedRaw
          .map((entry) => {
            if (!entry || typeof entry !== "object") return null;
            const record = entry as Record<string, unknown>;
            const position = typeof record.position === "number" ? record.position : null;
            if (position == null) return null;
            const reason = typeof record.reason === "string" ? record.reason : null;
            return { position, reason };
          })
          .filter((value): value is { position: number; reason: string | null } => value !== null)
      : [];

  const topConceptsRaw = kg?.top_concepts;
  const topConcepts = Array.isArray(topConceptsRaw)
    ? topConceptsRaw.filter((value): value is string => typeof value === "string")
    : [];

  return {
    retrieval: {
      chunkCount: configNumber(retrieval ?? undefined, "chunk_count"),
      strategy: configString(retrieval ?? undefined, "strategy"),
    },
    kg: {
      enabled: Boolean(kg?.enabled),
      conceptCount: configNumber(kg ?? undefined, "concept_count") ?? 0,
      prerequisiteCount: configNumber(kg ?? undefined, "prerequisite_count") ?? 0,
      relatedCount: configNumber(kg ?? undefined, "related_count") ?? 0,
      topConcepts,
    },
    ideation: {
      requested: configNumber(ideation ?? undefined, "requested_templates"),
      received: configNumber(ideation ?? undefined, "received_templates"),
      used: configNumber(ideation ?? undefined, "used_templates"),
    },
    generation: {
      requested: configNumber(generation ?? undefined, "requested_questions"),
      received: configNumber(generation ?? undefined, "received_questions"),
    },
    validation: {
      ran: Boolean(validation?.ran),
      accepted: configNumber(validation ?? undefined, "accepted"),
      rejectedCount: rejectedReasons.length,
      rejectedReasons,
    },
    mode: configString(pipeline ?? undefined, "mode"),
  };
}

function generationFailureMessage(run: GenerationRun | undefined) {
  if (!run || run.status !== "failed") return null;
  const config = run.config_json;
  const direct = configString(config, "error_message") ?? configString(config, "error");
  if (direct) return direct;
  const failure = config.failure;
  if (failure && typeof failure === "object") {
    const message = (failure as Record<string, unknown>).message;
    if (typeof message === "string" && message.trim()) return message;
  }
  return "Generation failed. Check material readiness and try again.";
}

function questionOptionsDraft(options: QuizQuestionOptionRead[] = []) {
  return options.map((option) => ({
    id: option.id,
    option_key: option.option_key,
    option_text: option.option_text,
    is_correct: option.is_correct,
  }));
}

function sourceRefLabels(sourceRefs: unknown) {
  if (!Array.isArray(sourceRefs)) return [];
  return sourceRefs.slice(0, 4).map((ref, index) => {
    if (typeof ref === "string") return `Chunk ${ref.slice(0, 8)}`;
    if (ref && typeof ref === "object") {
      const data = ref as Record<string, unknown>;
      const title = typeof data.material_title === "string" ? data.material_title : "Source";
      const page = typeof data.page === "number" ? ` p.${data.page}` : "";
      const chunkId = typeof data.chunk_id === "string" ? ` · ${data.chunk_id.slice(0, 8)}` : "";
      return `${title}${page}${chunkId}`;
    }
    return `Source ${index + 1}`;
  });
}

/* ── Single item row with drag-and-drop ── */
function ItemRow({
  item, courseId, isDragOver, isDragging,
  onDragStart, onDragOver, onDrop, onDragEnd, onDelete,
}: {
  item: CourseContentItem;
  courseId: string;
  isDragOver: boolean;
  isDragging: boolean;
  onDragStart: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: () => void;
  onDragEnd: () => void;
  onDelete: () => void;
}) {
  const lesson: CourseContentLesson | null = item.lesson;
  const quiz = item.quiz;
  const cfg = quiz ? QUIZ_ITEM_CONFIG : lesson ? LESSON_TYPE_CONFIG[lesson.lesson_type ?? "video"] : null;
  const Icon = cfg?.icon ?? BookOpen;
  const label = quiz ? QUIZ_ITEM_CONFIG.label : item.item_type === "interview" ? "Interview" : (cfg?.label ?? item.item_type);
  const title = lesson?.title ?? quiz?.title ?? label;
  const status = lesson?.status ?? quiz?.status;

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
      className={cn(
        "flex items-center gap-2.5 px-3 py-3 rounded-xl transition-all group select-none cursor-grab active:cursor-grabbing",
        isDragging ? "opacity-40" : "",
        isDragOver
          ? "bg-m3-primary-fixed border border-m3-primary/30 shadow-sm"
          : "hover:bg-m3-surface-container"
      )}
    >
      <GripVertical className="h-4 w-4 text-m3-outline-variant shrink-0" />
      <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center shrink-0", cfg?.badge ?? "bg-slate-50 text-slate-500")}>
        <Icon className="h-3.5 w-3.5" />
      </div>
      <span className="flex-1 text-sm font-medium text-m3-on-surface truncate">
        {title}
      </span>
      <Badge className={cn("text-[10px] border-0 shrink-0", cfg?.badge ?? "bg-slate-100 text-slate-500")}>
        {label}
      </Badge>
      {status && (
        <Badge className={cn("text-[10px] border-0 shrink-0", status === "published" ? "bg-emerald-100 text-emerald-700" : "bg-amber-50 text-amber-700")}>
          {status}
        </Badge>
      )}
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
        {lesson && (
          <Link
            to="/teacher/courses/$courseId/lessons/$lessonId"
            params={{ courseId, lessonId: lesson.id }}
            onClick={(e) => e.stopPropagation()}
          >
            <Button variant="ghost" size="icon" className="h-7 w-7">
              <Pencil className="h-3.5 w-3.5" />
            </Button>
          </Link>
        )}
        {quiz && (
          <Link
            to="/teacher/courses/$courseId/quizzes/$quizId"
            params={{ courseId, quizId: quiz.id }}
            onClick={(e) => e.stopPropagation()}
          >
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
          </Link>
        )}
        <Button
          variant="ghost" size="icon" className="h-7 w-7 text-m3-error hover:bg-m3-error/10"
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

/* ── Add lesson type pills ── */
function AddContentPills({ moduleId, courseId, itemCount }: {
  moduleId: string; courseId: string; itemCount: number;
}) {
  const navigate = useNavigate();
  const createLesson = useCreateLesson(moduleId, courseId);
  const createQuiz = useCreateQuiz(moduleId, courseId);
  const [adding, setAdding] = useState(false);

  function slugify(title: string) {
    return title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  }

  async function handleAdd(lessonType: string) {
    if (adding) return;
    const label = LESSON_TYPE_CONFIG[lessonType]?.label ?? lessonType;
    const title = `New ${label}`;
    setAdding(true);
    try {
      await createLesson.mutateAsync({
        title,
        slug: `${slugify(title)}-${Date.now().toString(36)}`,
        lesson_type: lessonType,
        status: "draft",
      });
      toast.success(`${label} added`);
    } catch (err: unknown) {
      toast.error((err as Error).message || "Failed to add lesson");
    } finally {
      setAdding(false);
    }
  }

  async function handleAddQuiz() {
    if (adding) return;
    setAdding(true);
    try {
      const quiz = await createQuiz.mutateAsync({
        title: `New Quiz ${itemCount + 1}`,
        description: "Draft quiz for this module.",
      });
      void navigate({
        to: "/teacher/courses/$courseId/quizzes/$quizId",
        params: { courseId, quizId: quiz.id },
      });
      toast.success("Quiz added");
    } catch (err: unknown) {
      toast.error((err as Error).message || "Failed to add quiz");
    } finally {
      setAdding(false);
    }
  }

  return (
    <div className="flex flex-wrap gap-2 mt-1 pt-4 border-t border-m3-outline-variant/10">
      <span className="w-full text-xs font-bold uppercase tracking-widest text-m3-on-surface-variant mb-1">Add Content</span>
      {Object.entries(LESSON_TYPE_CONFIG).map(([type, cfg]) => {
        const Icon = cfg.icon;
        return (
          <button
            key={type} type="button" disabled={adding}
            onClick={() => handleAdd(type)}
            className={ADD_PILL_CLS}
          >
            <Icon className="h-3.5 w-3.5" />
            <Plus className="h-3 w-3 -ml-0.5" />
            {cfg.label}
          </button>
        );
      })}
      <button
        type="button"
        disabled={adding}
        onClick={handleAddQuiz}
        className={ADD_PILL_CLS}
      >
        <HelpCircle className="h-3.5 w-3.5" />
        <Plus className="h-3 w-3 -ml-0.5" />
        Quiz
      </button>
    </div>
  );
}

function SourceLessonToggle({
  lesson,
  selected,
  onToggle,
  onReadyChange,
}: {
  lesson: CourseContentLesson;
  selected: boolean;
  onToggle: () => void;
  onReadyChange: (lessonId: string, ready: boolean) => void;
}) {
  const { data: summary, isLoading } = useTeacherProcessingSummary(lesson.id);
  const readyCount = summary?.completed_versions ?? 0;
  const processingCount = summary?.processing_versions ?? 0;
  const ready = readyCount > 0;

  useEffect(() => {
    onReadyChange(lesson.id, ready);
  }, [lesson.id, onReadyChange, ready]);

  return (
    <button
      type="button"
      disabled={!ready}
      aria-pressed={selected}
      onClick={onToggle}
      className={cn(
        "w-full min-h-11 rounded-xl border px-3 py-2 text-left transition-all cursor-pointer",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-m3-secondary/30",
        selected
          ? "border-m3-secondary bg-m3-secondary-fixed/30 shadow-sm"
          : "border-m3-outline-variant/20 bg-m3-surface hover:bg-m3-surface-container-low",
        !ready && "cursor-not-allowed opacity-60 hover:bg-m3-surface"
      )}
    >
      <div className="flex items-start gap-2.5">
        <span
          className={cn(
            "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border",
            selected ? "border-m3-secondary bg-m3-secondary text-white" : "border-m3-outline-variant/40"
          )}
        >
          {selected && <Check className="h-3.5 w-3.5" />}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold text-m3-on-surface">{lesson.title}</span>
          <span className="mt-1 flex flex-wrap items-center gap-1.5">
            {isLoading ? (
              <Badge className="border-0 bg-slate-100 text-slate-500 text-[10px] gap-1">
                <Loader2 className="h-2.5 w-2.5 animate-spin" /> Checking
              </Badge>
            ) : ready ? (
              <Badge className="border-0 bg-emerald-100 text-emerald-700 text-[10px] gap-1">
                <CheckCircle className="h-2.5 w-2.5" /> {readyCount} ready
              </Badge>
            ) : processingCount > 0 ? (
              <Badge className="border-0 bg-blue-100 text-blue-700 text-[10px] gap-1">
                <Loader2 className="h-2.5 w-2.5 animate-spin" /> Processing
              </Badge>
            ) : (
              <Badge className="border-0 bg-amber-50 text-amber-700 text-[10px] gap-1">
                <AlertCircle className="h-2.5 w-2.5" /> Needs material
              </Badge>
            )}
          </span>
        </span>
      </div>
    </button>
  );
}

function QuizToggle({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label
      className={cn(
        "flex items-start gap-3 rounded-xl border p-3 transition-colors cursor-pointer",
        checked
          ? "border-m3-secondary bg-m3-secondary-fixed/20"
          : "border-m3-outline-variant/20 bg-m3-surface"
      )}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 h-4 w-4 shrink-0"
      />
      <div>
        <p className="text-sm font-semibold text-m3-on-surface">{label}</p>
        <p className="text-xs text-m3-on-surface-variant mt-0.5">{description}</p>
      </div>
    </label>
  );
}

export function QuizQuestionReviewCard({ question }: { question: QuizQuestionRead }) {
  const patchQuestion = usePatchQuizQuestion();
  const deleteQuestion = useDeleteQuizQuestion(question.quiz_id);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [draft, setDraft] = useState({
    prompt_text: question.prompt_text,
    explanation: question.explanation ?? "",
    difficulty: question.difficulty ?? "medium",
    bloom_level: question.bloom_level ?? "understand",
    review_status: question.review_status,
    options: questionOptionsDraft(question.options),
  });

  useEffect(() => {
    setDraft({
      prompt_text: question.prompt_text,
      explanation: question.explanation ?? "",
      difficulty: question.difficulty ?? "medium",
      bloom_level: question.bloom_level ?? "understand",
      review_status: question.review_status,
      options: questionOptionsDraft(question.options),
    });
  }, [
    question.bloom_level,
    question.difficulty,
    question.explanation,
    question.id,
    question.options,
    question.prompt_text,
    question.review_status,
  ]);

  const sourceLabels = sourceRefLabels(question.source_refs_json);
  const hasOptions = question.question_type === "mcq" && draft.options.length > 0;

  async function save(reviewStatus = draft.review_status) {
    if (!draft.prompt_text.trim()) {
      toast.error("Question text is required");
      return;
    }
    if (hasOptions) {
      if (draft.options.some((option) => !option.option_text.trim())) {
        toast.error("All option text is required");
        return;
      }
      if (draft.options.filter((option) => option.is_correct).length !== 1) {
        toast.error("Select exactly one correct answer");
        return;
      }
    }
    try {
      await patchQuestion.mutateAsync({
        questionId: question.id,
        payload: {
          prompt_text: draft.prompt_text.trim(),
          explanation: draft.explanation.trim() || null,
          difficulty: draft.difficulty,
          bloom_level: draft.bloom_level,
          review_status: reviewStatus,
          ...(hasOptions
            ? {
                options: draft.options.map((option) => ({
                  id: option.id,
                  option_text: option.option_text.trim(),
                  is_correct: option.is_correct,
                })),
              }
            : {}),
        },
      });
      toast.success(reviewStatus === "approved" ? "Question approved" : "Question saved");
    } catch (err: unknown) {
      toast.error((err as Error).message || "Failed to save question");
    }
  }

  return (
    <div className="rounded-2xl border border-m3-outline-variant/20 bg-m3-surface p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Badge className="border-0 bg-m3-primary-fixed text-m3-primary text-[10px]">
          Q{question.position}
        </Badge>
        <Badge className="border-0 bg-violet-50 text-violet-700 text-[10px] capitalize">
          {question.question_type.replace("_", " ")}
        </Badge>
        <Badge
          className={cn(
            "border-0 text-[10px] capitalize",
            question.review_status === "approved"
              ? "bg-emerald-100 text-emerald-700"
              : "bg-amber-50 text-amber-700"
          )}
        >
          {question.review_status}
        </Badge>
      </div>

      <div className="space-y-1.5">
        <label className="text-[10px] font-bold uppercase tracking-widest text-m3-on-surface-variant">
          Question
        </label>
        <textarea
          value={draft.prompt_text}
          onChange={(e) => setDraft((current) => ({ ...current, prompt_text: e.target.value }))}
          rows={3}
          className="w-full rounded-xl border border-m3-outline-variant/20 bg-m3-surface-container-lowest px-3 py-2.5 text-sm text-m3-on-surface resize-none focus:outline-none focus:ring-2 focus:ring-m3-secondary/30"
        />
      </div>

      {hasOptions && (
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <label className="text-[10px] font-bold uppercase tracking-widest text-m3-on-surface-variant">
              Options
            </label>
            <span className="text-[10px] font-semibold text-m3-on-surface-variant">Mark one correct</span>
          </div>
          <div className="space-y-2">
            {draft.options.map((option) => (
              <div
                key={option.id}
                className={cn(
                  "flex flex-col gap-2 rounded-xl border p-2.5 sm:flex-row sm:items-center",
                  option.is_correct
                    ? "border-emerald-200 bg-emerald-50/70"
                    : "border-m3-outline-variant/20 bg-m3-surface-container-lowest"
                )}
              >
                <div className="flex items-center gap-2 sm:w-24 sm:shrink-0">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-m3-primary-fixed text-xs font-bold text-m3-primary">
                    {option.option_key}
                  </span>
                  <label className="flex items-center gap-1.5 text-xs font-semibold text-m3-on-surface-variant cursor-pointer">
                    <input
                      type="radio"
                      name={`correct-${question.id}`}
                      checked={option.is_correct}
                      onChange={() => setDraft((current) => ({
                        ...current,
                        options: current.options.map((item) => ({
                          ...item,
                          is_correct: item.id === option.id,
                        })),
                      }))}
                      className="h-4 w-4 accent-emerald-600"
                    />
                    Correct
                  </label>
                </div>
                <Input
                  value={option.option_text}
                  onChange={(e) => setDraft((current) => ({
                    ...current,
                    options: current.options.map((item) =>
                      item.id === option.id ? { ...item, option_text: e.target.value } : item
                    ),
                  }))}
                  className="bg-m3-surface text-sm"
                />
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label className="text-[10px] font-bold uppercase tracking-widest text-m3-on-surface-variant">
            Difficulty
          </label>
          <select
            value={draft.difficulty}
            onChange={(e) => setDraft((current) => ({ ...current, difficulty: e.target.value }))}
            className="w-full rounded-xl border border-m3-outline-variant/20 bg-m3-surface-container-lowest px-3 py-2 text-sm text-m3-on-surface focus:outline-none focus:ring-2 focus:ring-m3-secondary/30"
          >
            {DIFFICULTIES.filter((level) => level !== "mixed").map((level) => (
              <option key={level} value={level}>{level}</option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <label className="text-[10px] font-bold uppercase tracking-widest text-m3-on-surface-variant">
            Bloom Level
          </label>
          <select
            value={draft.bloom_level}
            onChange={(e) => setDraft((current) => ({ ...current, bloom_level: e.target.value }))}
            className="w-full rounded-xl border border-m3-outline-variant/20 bg-m3-surface-container-lowest px-3 py-2 text-sm text-m3-on-surface focus:outline-none focus:ring-2 focus:ring-m3-secondary/30"
          >
            {BLOOM_LEVELS.map((level) => (
              <option key={level} value={level}>{level}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="text-[10px] font-bold uppercase tracking-widest text-m3-on-surface-variant">
          Explanation
        </label>
        <textarea
          value={draft.explanation}
          onChange={(e) => setDraft((current) => ({ ...current, explanation: e.target.value }))}
          rows={2}
          className="w-full rounded-xl border border-m3-outline-variant/20 bg-m3-surface-container-lowest px-3 py-2.5 text-sm text-m3-on-surface resize-none focus:outline-none focus:ring-2 focus:ring-m3-secondary/30"
        />
      </div>

      {sourceLabels.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {sourceLabels.map((label) => (
            <Badge key={label} className="border-0 bg-slate-100 text-slate-600 text-[10px] gap-1">
              <FileText className="h-2.5 w-2.5" /> {label}
            </Badge>
          ))}
        </div>
      )}

      <div className="flex flex-wrap gap-2 pt-1">
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={patchQuestion.isPending}
          onClick={() => save()}
        >
          {patchQuestion.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
          Save
        </Button>
        <Button
          type="button"
          size="sm"
          disabled={patchQuestion.isPending}
          onClick={() => save("approved")}
          className="bg-emerald-600 text-white hover:bg-emerald-700"
        >
          <CheckCircle className="h-3.5 w-3.5" /> Approve
        </Button>
        <div className="ml-auto relative">
          {confirmingDelete ? (
            <div className="absolute right-0 bottom-full mb-2 w-64 rounded-xl bg-red-50 border border-red-200 p-3 shadow-lg space-y-2 z-10">
              <div className="flex items-start gap-2">
                <div className="h-7 w-7 rounded-lg bg-red-100 text-red-700 flex items-center justify-center shrink-0">
                  <Trash2 className="h-3.5 w-3.5" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-red-800">Delete this question?</p>
                  <p className="text-[11px] text-red-600 mt-0.5">This cannot be undone.</p>
                </div>
              </div>
              <div className="flex justify-end gap-1.5">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={deleteQuestion.isPending}
                  onClick={() => setConfirmingDelete(false)}
                  className="h-7 text-xs px-2.5"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  size="sm"
                  disabled={deleteQuestion.isPending}
                  onClick={async () => {
                    try {
                      await deleteQuestion.mutateAsync(question.id);
                      toast.success("Question deleted");
                    } catch (err: unknown) {
                      toast.error((err as Error).message || "Failed to delete question");
                    } finally {
                      setConfirmingDelete(false);
                    }
                  }}
                  className="h-7 text-xs px-2.5 bg-red-600 text-white hover:bg-red-700 border-0 gap-1"
                >
                  {deleteQuestion.isPending ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Trash2 className="h-3 w-3" />
                  )}
                  Delete
                </Button>
              </div>
            </div>
          ) : null}
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={patchQuestion.isPending || deleteQuestion.isPending}
            onClick={() => setConfirmingDelete(true)}
            className="border-red-200 text-red-700 hover:bg-red-50 hover:text-red-700 gap-1.5"
            title="Delete this question"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Delete
          </Button>
        </div>
      </div>
    </div>
  );
}

function PipelineSummary({ run }: { run: GenerationRun | undefined }) {
  const meta = extractPipelineMeta(run);
  if (!meta) return null;

  const status = run?.status;
  const isDone = status === "completed";
  const isRegen = meta.mode === "regenerate_question";

  const stages: Array<{ key: string; label: string; detail: string }> = [];
  if (meta.retrieval.chunkCount != null) {
    stages.push({
      key: "retrieval",
      label: "Retrieval",
      detail: `${meta.retrieval.chunkCount} chunk${meta.retrieval.chunkCount === 1 ? "" : "s"}${
        meta.retrieval.strategy ? ` · ${meta.retrieval.strategy}` : ""
      }`,
    });
  }
  if (meta.kg.enabled || meta.kg.conceptCount > 0) {
    stages.push({
      key: "kg",
      label: "Knowledge graph",
      detail: meta.kg.enabled
        ? `${meta.kg.conceptCount} concept${meta.kg.conceptCount === 1 ? "" : "s"} · ${meta.kg.prerequisiteCount} prerequisite${
            meta.kg.prerequisiteCount === 1 ? "" : "s"
          } · ${meta.kg.relatedCount} related`
        : "Disabled",
    });
  }
  if (!isRegen && meta.ideation.received != null) {
    stages.push({
      key: "ideation",
      label: "Ideation",
      detail: `${meta.ideation.received} template${meta.ideation.received === 1 ? "" : "s"}${
        meta.ideation.used != null ? ` · ${meta.ideation.used} used` : ""
      }`,
    });
  }
  if (meta.generation.received != null) {
    stages.push({
      key: "generation",
      label: "Generation",
      detail: `${meta.generation.received} candidate${meta.generation.received === 1 ? "" : "s"}`,
    });
  }
  if (meta.validation.ran || meta.validation.accepted != null) {
    const accepted = meta.validation.accepted ?? 0;
    const rejected = meta.validation.rejectedCount;
    stages.push({
      key: "validation",
      label: "Validation",
      detail: `${accepted} accepted${rejected > 0 ? ` · ${rejected} rejected` : ""}`,
    });
  }

  if (stages.length === 0) return null;

  return (
    <div className="rounded-2xl border border-m3-secondary/15 bg-m3-secondary-fixed/15 p-3 space-y-2">
      <div className="flex items-center gap-2">
        <Workflow className="h-3.5 w-3.5 text-m3-secondary" />
        <p className="text-[10px] font-bold uppercase tracking-widest text-m3-secondary">
          {isDone ? (isRegen ? "Question regenerated" : "Pipeline summary") : "Pipeline progress"}
        </p>
      </div>
      <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-1 text-xs text-m3-on-surface">
        {stages.map((stage) => (
          <li key={stage.key} className="flex items-baseline gap-1.5">
            <span className="font-semibold text-m3-on-surface-variant">{stage.label}</span>
            <span className="text-m3-on-surface">{stage.detail}</span>
          </li>
        ))}
      </ul>
      {meta.kg.topConcepts.length > 0 && (
        <div className="flex items-start gap-1.5 text-[11px] text-m3-on-surface-variant">
          <Network className="h-3 w-3 shrink-0 mt-0.5 text-m3-secondary" />
          <span className="leading-relaxed">
            <span className="font-semibold">Top concepts:</span>{" "}
            {meta.kg.topConcepts.slice(0, 6).join(", ")}
          </span>
        </div>
      )}
      {meta.validation.rejectedReasons.length > 0 && (
        <details className="text-[11px] text-m3-on-surface-variant">
          <summary className="cursor-pointer font-semibold">
            Why {meta.validation.rejectedReasons.length} candidate
            {meta.validation.rejectedReasons.length === 1 ? " was" : "s were"} rejected
          </summary>
          <ul className="mt-1 space-y-0.5 list-disc list-inside">
            {meta.validation.rejectedReasons.map((entry) => (
              <li key={entry.position}>
                #{entry.position} — {entry.reason ?? "No reason supplied."}
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}

export function QuizGenerationPanel({ module, courseId, targetQuizId, compact = false, showReview = true }: { module: CourseContentModule; courseId: string; targetQuizId?: string | null; compact?: boolean; showReview?: boolean }) {
  const lessonItems = module.items
    .filter((item) => item.item_type === "lesson" && item.lesson)
    .sort((a, b) => a.position - b.position) as Array<CourseContentItem & { lesson: CourseContentLesson }>;
  const generateQuiz = useGenerateQuiz(module.id);
  const publishQuiz = usePublishQuiz();
  const [selectedLessonIds, setSelectedLessonIds] = useState<string[]>([]);
  const [readyByLesson, setReadyByLesson] = useState<Record<string, boolean>>({});
  const [activeRunId, setActiveRunId] = useState<string | null>(null);
  const [draftQuizId, setDraftQuizId] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: `${module.title} AI Quiz`,
    description: "Generated from indexed lesson materials.",
    question_count: 5,
    difficulty: "medium",
  });

  const { data: activeRun } = useGenerationRun(activeRunId);
  const runQuizId = configString(activeRun?.config_json, "quiz_id");
  const quizId = targetQuizId ?? runQuizId ?? draftQuizId;
  const canLoadDraft = !activeRunId || activeRun?.status === "completed" || activeRun?.status === "failed";
  const { data: quiz } = useQuiz(canLoadDraft ? quizId : null);
  const { data: questions = [], isLoading: questionsLoading } = useQuizQuestions(canLoadDraft ? quizId : null);

  const handleReadyChange = useCallback((lessonId: string, ready: boolean) => {
    setReadyByLesson((current) => current[lessonId] === ready ? current : { ...current, [lessonId]: ready });
  }, []);

  const readySelectedLessonIds = selectedLessonIds.filter((lessonId) => readyByLesson[lessonId]);
  const readyLessonIds = lessonItems
    .map((item) => item.lesson.id)
    .filter((lessonId) => readyByLesson[lessonId]);

  function toggleLesson(lessonId: string) {
    setSelectedLessonIds((current) =>
      current.includes(lessonId) ? current.filter((id) => id !== lessonId) : [...current, lessonId]
    );
  }

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) {
      toast.error("Quiz title is required");
      return;
    }
    if (readySelectedLessonIds.length === 0) {
      toast.error("Select at least one lesson with ready AI material");
      return;
    }

    try {
      const run = await generateQuiz.mutateAsync({
        quiz_id: targetQuizId ?? null,
        title: form.title.trim(),
        description: form.description.trim() || null,
        question_count: form.question_count,
        question_types: ["mcq"],
        difficulty: form.difficulty,
        source_lesson_ids: readySelectedLessonIds,
      });
      setActiveRunId(run.id);
      if (!targetQuizId) setDraftQuizId(configString(run.config_json, "quiz_id"));
      toast.success(targetQuizId ? "AI questions are being added" : "Quiz generation started");
    } catch (err: unknown) {
      toast.error((err as Error).message || "Failed to start quiz generation");
    }
  }

  async function handlePublish() {
    if (!quizId) return;
    try {
      await publishQuiz.mutateAsync(quizId);
      toast.success("Quiz published to the module");
    } catch (err: unknown) {
      toast.error((err as Error).message || "Failed to publish quiz");
    }
  }

  const generationInProgress = generateQuiz.isPending || Boolean(
    activeRunId && (!activeRun || activeRun.status === "pending" || activeRun.status === "running")
  );
  const generationFailed = activeRun?.status === "failed";
  const generationError = generationFailureMessage(activeRun);
  const publishDisabled = !quizId || questions.length === 0 || quiz?.status === "published" || publishQuiz.isPending;

  return (
    <section className="mt-6 rounded-2xl border border-m3-secondary/10 bg-m3-surface-container-low overflow-hidden">
      <div className="px-5 py-4 border-b border-m3-outline-variant/10 flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex items-center gap-2 flex-1">
          <div className="h-9 w-9 rounded-xl gradient-primary flex items-center justify-center shadow-ai-glow">
            <Brain className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2 className="font-headline font-bold text-sm text-m3-on-surface">AI Material Hub Quiz Generator</h2>
            <p className="text-xs text-m3-on-surface-variant">
              {targetQuizId ? "Add AI-generated questions to this quiz from ready lesson materials." : "Generate, review, and publish a quiz from ready lesson materials."}
            </p>
          </div>
        </div>
        {quiz?.status && (
          <Badge className={cn(
            "border-0 text-xs capitalize",
            quiz.status === "published" ? "bg-emerald-100 text-emerald-700" : "bg-amber-50 text-amber-700"
          )}>
            {quiz.status}
          </Badge>
        )}
      </div>

      <div className={cn("gap-5 p-5", compact ? "space-y-5" : "grid grid-cols-1 xl:grid-cols-[0.85fr_1.15fr]")}>
        <form onSubmit={handleGenerate} className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <label className="text-xs font-bold uppercase tracking-widest text-m3-on-surface-variant">
                Source Lessons
              </label>
              <button
                type="button"
                disabled={readyLessonIds.length === 0}
                onClick={() => setSelectedLessonIds(readyLessonIds)}
                className="text-xs font-semibold text-m3-secondary hover:text-m3-primary disabled:text-m3-on-surface-variant/50 disabled:cursor-not-allowed cursor-pointer"
              >
                Select ready
              </button>
            </div>
            <div className="space-y-2">
              {lessonItems.length === 0 ? (
                <div className="rounded-xl bg-m3-surface p-4 text-sm text-m3-on-surface-variant text-center">
                  Add a lesson with AI-ready material before generating a quiz.
                </div>
              ) : (
                lessonItems.map((item) => (
                  <SourceLessonToggle
                    key={item.lesson.id}
                    lesson={item.lesson}
                    selected={selectedLessonIds.includes(item.lesson.id)}
                    onToggle={() => toggleLesson(item.lesson.id)}
                    onReadyChange={handleReadyChange}
                  />
                ))
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-widest text-m3-on-surface-variant">Quiz Title</label>
            <Input
              value={form.title}
              onChange={(e) => setForm((current) => ({ ...current, title: e.target.value }))}
              className="bg-m3-surface text-sm"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-widest text-m3-on-surface-variant">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm((current) => ({ ...current, description: e.target.value }))}
              rows={2}
              className="w-full rounded-xl border border-m3-outline-variant/20 bg-m3-surface px-3 py-2.5 text-sm text-m3-on-surface resize-none focus:outline-none focus:ring-2 focus:ring-m3-secondary/30"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-widest text-m3-on-surface-variant">Questions</label>
              <Input
                type="number"
                min={1}
                max={20}
                value={form.question_count}
                onChange={(e) => setForm((current) => ({
                  ...current,
                  question_count: Math.min(20, Math.max(1, Number(e.target.value) || 1)),
                }))}
                className="bg-m3-surface text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-widest text-m3-on-surface-variant">Difficulty</label>
              <select
                value={form.difficulty}
                onChange={(e) => setForm((current) => ({ ...current, difficulty: e.target.value }))}
                className="h-8 w-full rounded-lg border border-m3-outline-variant/20 bg-m3-surface px-2.5 text-sm text-m3-on-surface focus:outline-none focus:ring-2 focus:ring-m3-secondary/30"
              >
                {DIFFICULTIES.map((level) => (
                  <option key={level} value={level}>{level}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="rounded-xl bg-m3-secondary-fixed/20 border border-m3-secondary/10 p-3 flex gap-2 text-xs text-m3-on-surface-variant">
            <Sparkles className="h-4 w-4 text-m3-secondary shrink-0 mt-0.5" />
            <p>Only selected lessons with ready indexed material are sent to the generator. Questions start as drafts for teacher review.</p>
          </div>

          <Button
            type="submit"
            disabled={generationInProgress || readySelectedLessonIds.length === 0 || !form.title.trim()}
            className="w-full gap-2 gradient-primary text-white border-0 shadow-ai-glow"
          >
            {generationInProgress ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {generationInProgress ? "Generating…" : "Generate Quiz Draft"}
          </Button>
        </form>

        {(showReview || generationInProgress || generationFailed) && (
        <div className="space-y-4">
          {showReview && !quizId && !activeRunId && (
            <div className={cn(
              "h-full rounded-2xl border border-dashed border-m3-outline-variant/30 bg-m3-surface/70 flex flex-col items-center justify-center text-center p-8",
              compact ? "min-h-[160px]" : "min-h-[280px]",
            )}>
              <HelpCircle className="h-10 w-10 text-m3-outline-variant mb-3" />
              <p className="font-headline font-bold text-m3-on-surface">No quiz draft yet</p>
              <p className="text-sm text-m3-on-surface-variant mt-1 max-w-sm">
                Select ready lessons, generate a draft, then edit and approve questions before publishing.
              </p>
            </div>
          )}

          {generationInProgress && (
            <div className="rounded-2xl bg-m3-surface p-6 border border-m3-secondary/10 text-center space-y-3">
              <Loader2 className="h-8 w-8 animate-spin text-m3-secondary mx-auto" />
              <p className="font-headline font-bold text-m3-on-surface">Building quiz draft</p>
              <p className="text-sm text-m3-on-surface-variant">
                Retrieval → knowledge graph → ideation → generation → validation.
              </p>
              <PipelineSummary run={activeRun} />
            </div>
          )}

          {generationFailed && (
            <div className="rounded-2xl bg-red-50 p-4 border border-red-100 text-red-700 text-sm space-y-2">
              <div className="flex gap-2">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-semibold">Generation failed</p>
                  <p>{generationError}</p>
                </div>
              </div>
              <PipelineSummary run={activeRun} />
            </div>
          )}

          {showReview && quizId && !generationInProgress && (
            <div className="space-y-3">
              {activeRun && <PipelineSummary run={activeRun} />}
              <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-m3-on-surface-variant">Review Draft</p>
                  <h3 className="font-headline font-bold text-lg text-m3-on-surface">{quiz?.title ?? form.title}</h3>
                </div>
                <Button
                  type="button"
                  disabled={publishDisabled}
                  onClick={handlePublish}
                  className="gap-2 bg-emerald-600 text-white hover:bg-emerald-700"
                >
                  {publishQuiz.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                  {quiz?.status === "published" ? "Published" : "Publish Quiz"}
                </Button>
              </div>

              {questionsLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((item) => (
                    <div key={item} className="h-32 rounded-2xl bg-m3-surface animate-pulse" />
                  ))}
                </div>
              ) : questions.length === 0 ? (
                <div className="rounded-2xl bg-m3-surface p-6 text-center text-sm text-m3-on-surface-variant">
                  No questions have been created yet. Add one manually or generate from ready materials.
                </div>
              ) : (
                <div className="space-y-3">
                  {questions.map((question) => (
                    <QuizQuestionReviewCard key={question.id} question={question} />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
        )}
      </div>
    </section>
  );
}

export function QuizAuthoringPanel({ quizId, module, courseId, onClose, withGenerator = true }: {
  quizId: string;
  module: CourseContentModule;
  courseId: string;
  onClose: () => void;
  withGenerator?: boolean;
}) {
  const { data: quiz } = useQuiz(quizId);
  const patchQuiz = usePatchQuiz(courseId);
  const createQuestion = useCreateQuizQuestion();
  const [draft, setDraft] = useState<QuizSettingsDraft>({
    title: "",
    description: "",
    time_limit_seconds: "",
    passing_score_percent: "70",
    max_attempts: "",
    cooldown_hours: "",
    initial_ef: "",
    min_ef_for_unlock: "",
    coverage_threshold: "",
    allow_retakes: true,
    shuffle_questions: false,
    shuffle_options: false,
    show_hints: true,
    reminders_enabled: false,
  });

  useEffect(() => {
    if (!quiz) return;
    setDraft(quizDraftFromQuiz(quiz));
  }, [quiz]);

  async function saveQuiz(e: React.FormEvent) {
    e.preventDefault();
    if (!draft.title.trim()) {
      toast.error("Quiz title is required");
      return;
    }
    try {
      await patchQuiz.mutateAsync({
        quizId,
        payload: {
          title: draft.title.trim(),
          description: draft.description.trim() || null,
          time_limit_seconds: integerOrNull(draft.time_limit_seconds),
          passing_score_percent: decimalOrNull(draft.passing_score_percent),
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
      toast.success("Quiz details saved");
    } catch (err: unknown) {
      toast.error((err as Error).message || "Failed to save quiz");
    }
  }

  async function addQuestion() {
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

  return (
    <section className="mt-6 rounded-2xl border border-violet-100 bg-m3-surface-container-low overflow-hidden">
      <div className="px-5 py-4 border-b border-m3-outline-variant/10 flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex items-center gap-2 flex-1">
          <div className="h-9 w-9 rounded-xl bg-violet-100 text-violet-700 flex items-center justify-center">
            <HelpCircle className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-headline font-bold text-sm text-m3-on-surface">Quiz Authoring</h2>
            <p className="text-xs text-m3-on-surface-variant">Edit this real quiz, add manual questions, or use ready lesson materials to generate more.</p>
          </div>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={onClose}>Close</Button>
      </div>

      <div className="p-5 space-y-5">
        <form onSubmit={saveQuiz} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-widest text-m3-on-surface-variant">Quiz Title</label>
              <Input
                value={draft.title}
                onChange={(e) => setDraft((current) => ({ ...current, title: e.target.value }))}
                className="bg-m3-surface text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-widest text-m3-on-surface-variant">Description</label>
              <Input
                value={draft.description}
                onChange={(e) => setDraft((current) => ({ ...current, description: e.target.value }))}
                className="bg-m3-surface text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-widest text-m3-on-surface-variant">Time Limit (sec)</label>
              <Input
                type="number"
                min={0}
                value={draft.time_limit_seconds}
                onChange={(e) => setDraft((current) => ({ ...current, time_limit_seconds: e.target.value }))}
                className="bg-m3-surface text-sm"
                placeholder="900"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-widest text-m3-on-surface-variant">Passing Score %</label>
              <Input
                type="number"
                min={0}
                max={100}
                step="0.01"
                value={draft.passing_score_percent}
                onChange={(e) => setDraft((current) => ({ ...current, passing_score_percent: e.target.value }))}
                className="bg-m3-surface text-sm"
                placeholder="70"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-widest text-m3-on-surface-variant">Max Attempts</label>
              <Input
                type="number"
                min={1}
                value={draft.max_attempts}
                onChange={(e) => setDraft((current) => ({ ...current, max_attempts: e.target.value }))}
                className="bg-m3-surface text-sm"
                placeholder="Leave blank"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-widest text-m3-on-surface-variant">Cooldown (hrs)</label>
              <Input
                type="number"
                min={0}
                value={draft.cooldown_hours}
                onChange={(e) => setDraft((current) => ({ ...current, cooldown_hours: e.target.value }))}
                className="bg-m3-surface text-sm"
                placeholder="Optional"
              />
            </div>
          </div>

          <div className="rounded-2xl border border-m3-outline-variant/15 bg-m3-surface p-4 space-y-4">
            <div>
              <h3 className="font-headline font-bold text-sm text-m3-on-surface">Adaptive Review</h3>
              <p className="text-xs text-m3-on-surface-variant mt-1">
                Configure the SM2-style mastery settings already stored in the backend.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-widest text-m3-on-surface-variant">Initial EF</label>
                <Input
                  type="number"
                  min={1}
                  step="0.01"
                  value={draft.initial_ef}
                  onChange={(e) => setDraft((current) => ({ ...current, initial_ef: e.target.value }))}
                  className="bg-m3-surface text-sm"
                  placeholder="e.g. 2.50"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-widest text-m3-on-surface-variant">Unlock EF Floor</label>
                <Input
                  type="number"
                  min={1}
                  step="0.01"
                  value={draft.min_ef_for_unlock}
                  onChange={(e) => setDraft((current) => ({ ...current, min_ef_for_unlock: e.target.value }))}
                  className="bg-m3-surface text-sm"
                  placeholder="e.g. 2.30"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-widest text-m3-on-surface-variant">Coverage Threshold %</label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  step="0.01"
                  value={draft.coverage_threshold}
                  onChange={(e) => setDraft((current) => ({ ...current, coverage_threshold: e.target.value }))}
                  className="bg-m3-surface text-sm"
                  placeholder="e.g. 85"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
            <QuizToggle
              label="Allow Retakes"
              description="Students can open another attempt after submitting."
              checked={draft.allow_retakes}
              onChange={(checked) => setDraft((current) => ({ ...current, allow_retakes: checked }))}
            />
            <QuizToggle
              label="Shuffle Questions"
              description="Keep the same quiz content but vary the question order."
              checked={draft.shuffle_questions}
              onChange={(checked) => setDraft((current) => ({ ...current, shuffle_questions: checked }))}
            />
            <QuizToggle
              label="Shuffle Options"
              description="Randomize answer option order for each question."
              checked={draft.shuffle_options}
              onChange={(checked) => setDraft((current) => ({ ...current, shuffle_options: checked }))}
            />
            <QuizToggle
              label="Show Hints"
              description="Let students reveal question hints during an attempt."
              checked={draft.show_hints}
              onChange={(checked) => setDraft((current) => ({ ...current, show_hints: checked }))}
            />
            <QuizToggle
              label="Review Reminders"
              description="Expose reminder intent for spaced review follow-up."
              checked={draft.reminders_enabled}
              onChange={(checked) => setDraft((current) => ({ ...current, reminders_enabled: checked }))}
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <Button type="submit" size="sm" disabled={patchQuiz.isPending} variant="outline">
              {patchQuiz.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
              Save Quiz
            </Button>
            <Button type="button" size="sm" disabled={createQuestion.isPending} onClick={addQuestion} className="gap-2">
              {createQuestion.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
              Add MCQ
            </Button>
          </div>
        </form>

        {withGenerator && (
          <QuizGenerationPanel module={module} courseId={courseId} targetQuizId={quizId} />
        )}
      </div>
    </section>
  );
}

/* ── Module settings sidebar ── */
function ModuleSettings({ module, courseId }: { module: CourseContentModule; courseId: string }) {
  const updateModule = useUpdateModule(module.id, courseId);
  const [description, setDescription] = useState(module.description ?? "");
  const [estimatedMinutes, setEstimatedMinutes] = useState(module.estimated_minutes?.toString() ?? "");
  const [saving, setSaving] = useState(false);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await updateModule.mutateAsync({
        description: description.trim() || undefined,
        estimated_minutes: estimatedMinutes ? Number(estimatedMinutes) : undefined,
      });
      toast.success("Module settings saved");
    } catch (err: unknown) {
      toast.error((err as Error).message || "Save failed");
    } finally {
      setSaving(false);
    }
  }

  const publishedCount = module.items.filter((i) => {
    if (i.item_type === "lesson") return i.lesson?.status === "published";
    if (i.item_type === "quiz") return i.quiz?.status === "published";
    if (i.item_type === "interview") return i.interview?.status === "published";
    return false;
  }).length;
  const draftCount = module.items.length - publishedCount;

  return (
    <div className="space-y-5">
      {/* Stats */}
      <div className="bg-m3-surface-container-low rounded-2xl p-5 space-y-4">
        <h3 className="font-headline font-bold text-base text-m3-primary">Module Stats</h3>
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: "Total Items", value: module.items.length },
            { label: "Published", value: publishedCount },
            { label: "Draft", value: draftCount },
            { label: "Est. Minutes", value: module.estimated_minutes ?? "—" },
          ].map(({ label, value }) => (
            <div key={label} className="bg-m3-surface rounded-xl p-3 text-center">
              <p className="text-lg font-headline font-bold text-m3-primary">{value}</p>
              <p className="text-[10px] font-bold uppercase tracking-widest text-m3-on-surface-variant mt-0.5">{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Settings form */}
      <form onSubmit={handleSave} className="bg-m3-surface-container-low rounded-2xl p-5 space-y-4">
        <h3 className="font-headline font-bold text-base text-m3-primary">Settings</h3>

        <div className="space-y-1.5">
          <label className="text-xs font-bold uppercase tracking-widest text-m3-on-surface-variant">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            placeholder="Brief description of this module…"
            className="w-full px-4 py-3 text-sm bg-m3-surface border border-m3-outline-variant/20 rounded-xl text-m3-on-surface resize-none focus:outline-none focus:ring-2 focus:ring-m3-secondary/20 transition-all placeholder:text-m3-on-surface-variant/40"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-bold uppercase tracking-widest text-m3-on-surface-variant">Estimated Duration (min)</label>
          <Input
            type="number" min={0}
            value={estimatedMinutes}
            onChange={(e) => setEstimatedMinutes(e.target.value)}
            placeholder="e.g. 60"
            className="text-sm bg-m3-surface"
          />
        </div>

        <Button type="submit" size="sm" disabled={saving} className="w-full gap-2 gradient-primary text-white border-0">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save Settings
        </Button>
      </form>
    </div>
  );
}

/* ════════════════════════════════════════
   Main page
   ════════════════════════════════════════ */
export default function ModuleManagePage() {
  const { courseId, moduleId } = useParams({ strict: false }) as { courseId: string; moduleId: string };

  const { data: course } = useTeacherCourseById(courseId);
  const { data: content, isLoading } = useTeacherCourseContent(courseId);

  const module: CourseContentModule | undefined = content?.modules.find((m) => m.id === moduleId);

  const updateModule = useUpdateModule(moduleId, courseId);
  const reorderItems = useReorderModuleItems(moduleId, courseId);
  const deleteItem = useDeleteModuleItem(courseId);

  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState("");
  const titleInputRef = useRef<HTMLInputElement>(null);

  const [dragSourceIdx, setDragSourceIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-m3-secondary" />
      </div>
    );
  }

  if (!module) {
    return (
      <div className="text-center py-24 text-m3-on-surface-variant">
        Module not found.{" "}
        <Link to="/teacher/courses/$courseId" params={{ courseId }} className="text-m3-primary hover:underline">
          Back to course
        </Link>
      </div>
    );
  }

  const currentTitle = titleDraft || module.title;
  const sortedItems = [...module.items].sort((a, b) => a.position - b.position);

  function startEdit(e: React.MouseEvent) {
    e.stopPropagation();
    setTitleDraft(module!.title);
    setEditingTitle(true);
    setTimeout(() => titleInputRef.current?.focus(), 0);
  }

  function saveTitle() {
    setEditingTitle(false);
    const trimmed = titleDraft.trim();
    if (trimmed && trimmed !== module!.title) {
      updateModule.mutate({ title: trimmed }, {
        onError: (err) => toast.error((err as Error).message),
      });
    }
  }

  function toggleStatus() {
    const next = module!.status === "published" ? "draft" : "published";
    updateModule.mutate({ status: next }, {
      onSuccess: () => toast.success(next === "published" ? "Module published" : "Module unpublished"),
      onError: (err) => toast.error((err as Error).message),
    });
  }

  function handleDrop(dropIdx: number) {
    if (dragSourceIdx === null || dragSourceIdx === dropIdx) {
      setDragSourceIdx(null);
      setDragOverIdx(null);
      return;
    }
    const newOrder = [...sortedItems];
    const [moved] = newOrder.splice(dragSourceIdx, 1);
    newOrder.splice(dropIdx, 0, moved);
    reorderItems.mutate(newOrder.map((i) => i.id), {
      onError: (err) => toast.error((err as Error).message || "Reorder failed"),
    });
    setDragSourceIdx(null);
    setDragOverIdx(null);
  }

  function handleDeleteItem(itemId: string) {
    deleteItem.mutate(itemId, {
      onSuccess: () => toast.success("Item removed"),
      onError: (err) => toast.error((err as Error).message),
    });
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-xs text-m3-on-surface-variant">
        <Link to="/teacher/courses" className="hover:text-m3-primary transition-colors">My Courses</Link>
        <ArrowRight className="h-3 w-3" />
        <Link to="/teacher/courses/$courseId" params={{ courseId }} className="hover:text-m3-primary transition-colors truncate max-w-[160px]">
          {course?.title ?? "…"}
        </Link>
        <ArrowRight className="h-3 w-3" />
        <span className="text-m3-on-surface font-medium truncate max-w-[180px]">{module.title}</span>
      </div>

      {/* Header */}
      <div className="flex items-start gap-3">
        <Link to="/teacher/courses/$courseId" params={{ courseId }}>
          <Button variant="ghost" size="icon" className="h-8 w-8 mt-1 shrink-0">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>

        <div className="flex-1 min-w-0">
          {editingTitle ? (
            <input
              ref={titleInputRef}
              value={titleDraft}
              onChange={(e) => setTitleDraft(e.target.value)}
              onBlur={saveTitle}
              onKeyDown={(e) => {
                if (e.key === "Enter") saveTitle();
                if (e.key === "Escape") { setEditingTitle(false); setTitleDraft(module.title); }
              }}
              className="w-full font-headline font-bold text-2xl text-m3-primary bg-transparent border-b-2 border-m3-primary outline-none py-0.5"
            />
          ) : (
            <div className="flex items-center gap-2 group">
              <h1
                className="font-headline font-bold text-2xl text-m3-on-surface cursor-text"
                onClick={startEdit}
              >
                {updateModule.isPending && updateModule.variables && "title" in updateModule.variables
                  ? (updateModule.variables as { title?: string }).title ?? module.title
                  : module.title}
              </h1>
              <button
                type="button"
                onClick={startEdit}
                className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-lg text-m3-on-surface-variant hover:bg-m3-surface-container-high hover:text-m3-primary cursor-pointer"
              >
                {editingTitle ? <Check className="h-3.5 w-3.5" /> : <Pencil className="h-3.5 w-3.5" />}
              </button>
            </div>
          )}

          <div className="flex items-center gap-2 mt-1.5">
            <span
              className={cn(
                "text-[10px] font-bold px-2.5 py-1 rounded-full border-0",
                module.status === "published"
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-amber-50 text-amber-700"
              )}
            >
              {updateModule.isPending && updateModule.variables && "status" in updateModule.variables
                ? "…"
                : module.status}
            </span>
            <span className="text-xs text-m3-on-surface-variant">
              {sortedItems.length} item{sortedItems.length !== 1 ? "s" : ""}
              {module.estimated_minutes && ` · ~${module.estimated_minutes}m`}
            </span>
          </div>
        </div>

        {/* Publish / Unpublish action */}
        <Button
          type="button"
          onClick={toggleStatus}
          disabled={updateModule.isPending}
          variant={module.status === "published" ? "outline" : "default"}
          className={cn(
            "shrink-0 gap-2",
            module.status === "published"
              ? ""
              : "bg-emerald-600 text-white hover:bg-emerald-700 border-0"
          )}
          title={
            module.status === "published"
              ? "Hide this module from students"
              : "Make this module visible to enrolled students"
          }
        >
          {updateModule.isPending && updateModule.variables && "status" in updateModule.variables ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : module.status === "published" ? (
            <EyeOff className="h-4 w-4" />
          ) : (
            <CheckCircle className="h-4 w-4" />
          )}
          {module.status === "published" ? "Unpublish" : "Publish"}
        </Button>
      </div>

      {/* Main 2-col layout */}
      <div className="grid grid-cols-12 gap-6 items-start">
        {/* Items list — 8 cols */}
        <div className="col-span-12 lg:col-span-8">
          <div className="bg-m3-surface-container-low rounded-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-m3-outline-variant/10 flex items-center gap-2">
              <h2 className="font-headline font-bold text-sm text-m3-on-surface flex-1">Curriculum Items</h2>
              <span className="text-xs text-m3-on-surface-variant">Drag to reorder</span>
            </div>

            <div className="p-4 space-y-1.5">
              {sortedItems.length === 0 && (
                <p className="text-sm text-m3-on-surface-variant text-center py-6">No items yet. Add one below.</p>
              )}
              {sortedItems.map((item, idx) => (
                <ItemRow
                  key={item.id}
                  item={item}
                  courseId={courseId}
                  isDragOver={dragOverIdx === idx}
                  isDragging={dragSourceIdx === idx}
                  onDragStart={(e) => {
                    setDragSourceIdx(idx);
                    const el = e.currentTarget as HTMLElement;
                    const rect = el.getBoundingClientRect();
                    e.dataTransfer.setDragImage(el, e.clientX - rect.left, e.clientY - rect.top);
                  }}
                  onDragOver={(e) => { e.preventDefault(); setDragOverIdx(idx); }}
                  onDrop={() => handleDrop(idx)}
                  onDragEnd={() => { setDragSourceIdx(null); setDragOverIdx(null); }}
                  onDelete={() => handleDeleteItem(item.id)}
                />
              ))}

              <AddContentPills
                moduleId={moduleId}
                courseId={courseId}
                itemCount={sortedItems.length}
              />
            </div>
          </div>
        </div>

        {/* Sidebar — 4 cols */}
        <aside className="col-span-12 lg:col-span-4 lg:sticky lg:top-24 self-start">
          <ModuleSettings module={module} courseId={courseId} />
        </aside>
      </div>
    </div>
  );
}
