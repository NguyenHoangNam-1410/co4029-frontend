import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useParams } from "@tanstack/react-router";
import {
  ArrowLeft, ArrowRight, Video, HelpCircle, BookOpen, Code,
  GripVertical, Pencil, Check, Loader2, Plus, Save,
  ChevronDown, ChevronRight, Trash2, Sparkles, CheckCircle,
  AlertCircle, FileText, Brain,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  useTeacherCourseById,
  useTeacherCourseContent,
  useUpdateModule,
  useCreateLesson,
  useReorderModuleItems,
  useDeleteModuleItem,
  useGenerateQuiz,
  useGenerationRun,
  usePatchQuizQuestion,
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
import type { GenerationRun, QuizQuestionOptionRead, QuizQuestionRead } from "@/lib/api/types/teacher";
import { cn } from "@/lib/utils";

const LESSON_TYPE_CONFIG: Record<string, {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge: string;
}> = {
  video:    { label: "Video",    icon: Video,      badge: "bg-blue-50 text-blue-700" },
  quiz:     { label: "Quiz",     icon: HelpCircle, badge: "bg-violet-50 text-violet-700" },
  reading:  { label: "Reading",  icon: BookOpen,   badge: "bg-emerald-50 text-emerald-700" },
  exercise: { label: "Exercise", icon: Code,       badge: "bg-amber-50 text-amber-700" },
};

const ADD_PILL_CLS =
  "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-m3-on-surface-variant " +
  "bg-m3-surface-container-lowest border border-m3-outline-variant/20 " +
  "hover:bg-m3-primary-fixed hover:text-m3-primary hover:border-m3-primary/20 transition-colors cursor-pointer";

const DIFFICULTIES = ["easy", "medium", "hard", "mixed"] as const;
const BLOOM_LEVELS = ["remember", "understand", "apply", "analyze", "evaluate", "create"] as const;

function configString(config: Record<string, unknown> | undefined, key: string) {
  const value = config?.[key];
  return typeof value === "string" ? value : null;
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
  const cfg = lesson ? LESSON_TYPE_CONFIG[lesson.lesson_type ?? "video"] : null;
  const Icon = cfg?.icon ?? BookOpen;
  const label = item.item_type === "quiz" ? "Quiz" : item.item_type === "interview" ? "Interview" : (cfg?.label ?? item.item_type);

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
        {lesson?.title ?? label}
      </span>
      <Badge className={cn("text-[10px] border-0 shrink-0", cfg?.badge ?? "bg-slate-100 text-slate-500")}>
        {label}
      </Badge>
      {lesson && (
        <Badge className={cn("text-[10px] border-0 shrink-0", lesson.status === "published" ? "bg-emerald-100 text-emerald-700" : "bg-amber-50 text-amber-700")}>
          {lesson.status}
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
function AddLessonPills({ moduleId, courseId, itemCount }: {
  moduleId: string; courseId: string; itemCount: number;
}) {
  const createLesson = useCreateLesson(moduleId, courseId);
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

function QuizQuestionReviewCard({ question }: { question: QuizQuestionRead }) {
  const patchQuestion = usePatchQuizQuestion();
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
      </div>
    </div>
  );
}

function QuizGenerationPanel({ module, courseId }: { module: CourseContentModule; courseId: string }) {
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
  const quizId = runQuizId ?? draftQuizId;
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
        title: form.title.trim(),
        description: form.description.trim() || null,
        question_count: form.question_count,
        question_types: ["mcq"],
        difficulty: form.difficulty,
        source_lesson_ids: readySelectedLessonIds,
      });
      setActiveRunId(run.id);
      setDraftQuizId(configString(run.config_json, "quiz_id"));
      toast.success("Quiz generation started");
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
            <h2 className="font-headline font-bold text-sm text-m3-on-surface">AI Quiz Generator</h2>
            <p className="text-xs text-m3-on-surface-variant">Generate, review, and publish a quiz from ready lesson materials.</p>
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

      <div className="grid grid-cols-1 xl:grid-cols-[0.85fr_1.15fr] gap-5 p-5">
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

        <div className="space-y-4">
          {!quizId && !activeRunId && (
            <div className="h-full min-h-[280px] rounded-2xl border border-dashed border-m3-outline-variant/30 bg-m3-surface/70 flex flex-col items-center justify-center text-center p-8">
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
              <p className="text-sm text-m3-on-surface-variant">Retrieving source chunks and validating generated questions.</p>
            </div>
          )}

          {generationFailed && (
            <div className="rounded-2xl bg-red-50 p-4 border border-red-100 text-red-700 text-sm flex gap-2">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-semibold">Generation failed</p>
                <p>{generationError}</p>
              </div>
            </div>
          )}

          {quizId && !generationInProgress && (
            <div className="space-y-3">
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
                  No questions have been created yet.
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
  const [statusOpen, setStatusOpen] = useState(false);
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
      onSuccess: () => toast.success(`Module ${next}`),
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
            <button
              type="button"
              onClick={toggleStatus}
              disabled={updateModule.isPending}
              className={cn(
                "text-[10px] font-bold px-2.5 py-1 rounded-full border-0 transition-colors cursor-pointer",
                module.status === "published"
                  ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                  : "bg-amber-50 text-amber-700 hover:bg-amber-100"
              )}
            >
              {updateModule.isPending ? "…" : module.status}
            </button>
            <span className="text-xs text-m3-on-surface-variant">
              {sortedItems.length} item{sortedItems.length !== 1 ? "s" : ""}
              {module.estimated_minutes && ` · ~${module.estimated_minutes}m`}
            </span>
          </div>
        </div>
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

              <AddLessonPills
                moduleId={moduleId}
                courseId={courseId}
                itemCount={sortedItems.length}
              />
            </div>
          </div>

          <QuizGenerationPanel module={module} courseId={courseId} />
        </div>

        {/* Sidebar — 4 cols */}
        <aside className="col-span-12 lg:col-span-4 lg:sticky lg:top-24 self-start">
          <ModuleSettings module={module} courseId={courseId} />
        </aside>
      </div>
    </div>
  );
}
