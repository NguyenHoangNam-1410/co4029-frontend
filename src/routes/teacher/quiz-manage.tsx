import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "@tanstack/react-router";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Clock,
  Eye,
  HelpCircle,
  Loader2,
  Plus,
  RefreshCw,
  Save,
  Sparkles,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { AIInsightChip } from "@/components/ui/ai-insight-chip";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { ApiError } from "@/lib/api/client";
import {
  useAddQuizQuestion,
  useBulkSetExpectedTime,
  useDeleteQuiz,
  useDeleteQuizQuestion,
  useGenerateQuiz,
  usePatchQuiz,
  usePublishQuiz,
  useQuizAuthoring,
  useQuizGenerationRun,
  useRegenerateQuestion,
  useUpdateQuizQuestion,
} from "@/lib/api/hooks/quizzes";
import {
  useTeacherCourseById,
  useTeacherCourseContent,
} from "@/lib/api/hooks/teacher-courses";
import type {
  GenerationRunRead,
  QuizAuthoring,
  QuizQuestionAuthoring,
} from "@/lib/api/types";
import { cn } from "@/lib/utils";

type TabKey = "questions" | "settings" | "preview";

const TABS: ReadonlyArray<{ key: TabKey; label: string }> = [
  { key: "questions", label: "Câu hỏi" },
  { key: "settings", label: "Cấu hình" },
  { key: "preview", label: "Xem trước" },
];

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

function draftFromQuiz(quiz: QuizAuthoring): SettingsDraft {
  const passingNum = Number(quiz.passing_score_percent ?? 70);
  return {
    title: quiz.title ?? "",
    description: quiz.description ?? "",
    time_limit_minutes:
      quiz.time_limit_seconds == null
        ? ""
        : String(Math.max(1, Math.round(quiz.time_limit_seconds / 60))),
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

export default function QuizManagePage() {
  const navigate = useNavigate();
  const { courseId, quizId } = useParams({ strict: false }) as {
    courseId: string;
    quizId: string;
  };

  const { data: course } = useTeacherCourseById(courseId);
  const { data: authoring, isLoading: authoringLoading } =
    useQuizAuthoring(quizId);
  const { data: content, isLoading: contentLoading } =
    useTeacherCourseContent(courseId);

  const quiz = authoring?.quiz;
  const questions = useMemo(() => authoring?.questions ?? [], [authoring]);

  const courseModule = useMemo(
    () => content?.modules.find((entry) => entry.id === quiz?.module_id),
    [content, quiz?.module_id],
  );

  const deleteQuiz = useDeleteQuiz(quizId);
  const publishQuiz = usePublishQuiz(quizId);
  const patchQuiz = usePatchQuiz(quizId);
  const addQuestion = useAddQuizQuestion(quizId);
  const generateQuiz = useGenerateQuiz(quizId);

  const [tab, setTab] = useState<TabKey>("questions");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [draft, setDraft] = useState<SettingsDraft | null>(null);
  const [activeRunId, setActiveRunId] = useState<string | null>(null);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [selectedQuestionIds, setSelectedQuestionIds] = useState<Set<string>>(
    new Set(),
  );
  const [bulkSeconds, setBulkSeconds] = useState<string>("60");

  useEffect(() => {
    if (quiz) setDraft(draftFromQuiz(quiz));
  }, [quiz]);

  useEffect(() => {
    setSelectedQuestionIds((current) => {
      const valid = new Set(questions.map((q) => q.id));
      const next = new Set<string>();
      current.forEach((id) => {
        if (valid.has(id)) next.add(id);
      });
      return next.size === current.size ? current : next;
    });
  }, [questions]);

  if (authoringLoading || contentLoading) {
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
          <div className="h-12 w-12 rounded-xl bg-blue-100 text-blue-800 flex items-center justify-center">
            <HelpCircle className="h-6 w-6" />
          </div>
        </div>
        <div>
          <p className="font-headline font-bold text-m3-on-surface">
            Không tìm thấy bài kiểm tra
          </p>
          <p className="text-sm mt-1">
            Bài kiểm tra này không thể tải cho khoá học.
          </p>
        </div>
        <Link to="/teacher/courses/$courseId" params={{ courseId }} className="inline-flex">
          <Button variant="outline" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Quay lại khoá học
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
      await deleteQuiz.mutateAsync();
      toast.success("Đã xoá bài kiểm tra");
      returnToModule();
    } catch (err: unknown) {
      toast.error((err as Error).message || "Không thể xoá bài kiểm tra");
    } finally {
      setConfirmDelete(false);
    }
  }

  async function handlePublish() {
    if (publishDisabled) return;
    try {
      await publishQuiz.mutateAsync();
      toast.success("Đã xuất bản bài kiểm tra");
    } catch (err: unknown) {
      if (
        err instanceof ApiError &&
        err.status === 422 &&
        (err.code === "missing_t_exp" ||
          err.code === "missing_expected_response_time" ||
          err.code === "missing_expected_time")
      ) {
        return;
      }
      toast.error((err as Error).message || "Không thể xuất bản bài kiểm tra");
    }
  }

  async function handleAddQuestion() {
    try {
      await addQuestion.mutateAsync({
        question_type: "multiple_choice",
        prompt_text: "Câu hỏi mới",
        explanation: "Thêm giải thích cho đáp án đúng.",
        difficulty: "medium",
        bloom_level: "understand",
        options: [
          { option_key: "A", option_text: "Lựa chọn A", is_correct: true },
          { option_key: "B", option_text: "Lựa chọn B", is_correct: false },
          { option_key: "C", option_text: "Lựa chọn C", is_correct: false },
          { option_key: "D", option_text: "Lựa chọn D", is_correct: false },
        ],
      });
      toast.success("Đã thêm câu hỏi");
    } catch (err: unknown) {
      toast.error((err as Error).message || "Không thể thêm câu hỏi");
    }
  }

  async function handleSaveSettings(e: React.FormEvent) {
    e.preventDefault();
    if (!draft) return;
    if (!draft.title.trim()) {
      toast.error("Tiêu đề bài kiểm tra là bắt buộc");
      return;
    }
    const minutesRaw = draft.time_limit_minutes.trim();
    const timeLimitSeconds = minutesRaw
      ? Math.max(0, Math.round(Number(minutesRaw) * 60))
      : null;
    try {
      await patchQuiz.mutateAsync({
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
      });
      toast.success("Đã lưu cấu hình");
    } catch (err: unknown) {
      toast.error((err as Error).message || "Không thể lưu cấu hình");
    }
  }

  async function handleStartGeneration(payload: {
    target_count: number;
    focus_topics: string[];
  }) {
    try {
      const run = await generateQuiz.mutateAsync({
        mode: "full",
        target_count: payload.target_count,
        focus_topics: payload.focus_topics,
        source_lessons: [],
      });
      setActiveRunId(run.id);
      setShowGenerateModal(true);
      toast.success("Đã bắt đầu tạo câu hỏi");
    } catch (err: unknown) {
      if (err instanceof ApiError && err.status === 409) {
        toast.error("Một lần tạo khác đang chạy. Hãy chờ một lát.");
        return;
      }
      toast.error((err as Error).message || "Không thể tạo câu hỏi");
    }
  }

  function toggleQuestionSelection(id: string) {
    setSelectedQuestionIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAllQuestions() {
    setSelectedQuestionIds(new Set(questions.map((q) => q.id)));
  }

  function clearSelection() {
    setSelectedQuestionIds(new Set());
  }

  return (
    <div className="space-y-6 pb-12 max-w-[1500px] mx-auto">
      <Breadcrumbs
        items={[
          { label: "Giảng dạy", to: "/teacher/courses" },
          { label: course?.title ?? "Khóa học", to: "/teacher/courses/$courseId" },
          {
            label: courseModule.title,
            to: "/teacher/courses/$courseId/modules/$moduleId",
          },
          { label: quiz.title },
        ]}
      />

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
              title="Quay lại module"
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
                {questions.length} câu hỏi
              </Badge>
              {isPublished ? (
                <Badge className="border-0 bg-emerald-100 text-emerald-700 text-[11px] font-bold gap-1.5 rounded-full px-2.5 py-1">
                  <CheckCircle2 className="h-3 w-3" />
                  Đã xuất bản
                </Badge>
              ) : (
                <Badge className="border-0 bg-amber-50 text-amber-700 text-[11px] font-bold rounded-full px-2.5 py-1">
                  Bản nháp
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

        <div className="flex items-center gap-2 flex-wrap shrink-0">
          {course?.slug && (
            <Link
              to="/courses/$slug/quiz/$quizId"
              params={{ slug: course.slug, quizId }}
            >
              <Button variant="outline" className="gap-2" type="button">
                <Eye className="h-4 w-4" />
                Xem như học viên
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
                ? "Cần thêm ít nhất một câu hỏi trước khi xuất bản"
                : isPublished
                  ? "Đã xuất bản"
                  : "Xuất bản bài kiểm tra này"
            }
          >
            {publishQuiz.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : isPublished ? (
              <CheckCircle2 className="h-4 w-4" />
            ) : (
              <Upload className="h-4 w-4" />
            )}
            {isPublished ? "Đã xuất bản" : "Xuất bản"}
          </Button>
          <Button
            type="button"
            variant="outline"
            className="gap-2 border-red-200 text-red-700 hover:bg-red-50 hover:text-red-700"
            onClick={() => setConfirmDelete(true)}
            disabled={deleteQuiz.isPending}
            title="Xoá bài kiểm tra, câu hỏi, lượt làm bài và mục module"
          >
            <Trash2 className="h-4 w-4" />
            Xoá
          </Button>
        </div>
      </div>

      <div className="bg-m3-surface-container-low rounded-xl p-1 inline-flex gap-1 border border-m3-outline-variant/20 shadow-glass">
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
                  ? "bg-surface-elev text-m3-primary shadow-sm"
                  : "text-m3-on-surface-variant hover:text-m3-primary/80",
              )}
            >
              {entry.label}
            </button>
          );
        })}
      </div>

      {tab === "questions" && (
        <QuestionsTab
          quizId={quizId}
          questions={questions}
          selectedIds={selectedQuestionIds}
          onToggleSelect={toggleQuestionSelection}
          onSelectAll={selectAllQuestions}
          onClearSelection={clearSelection}
          bulkSeconds={bulkSeconds}
          onBulkSecondsChange={setBulkSeconds}
          onAddQuestion={handleAddQuestion}
          addPending={addQuestion.isPending}
          onOpenGenerator={() => setShowGenerateModal(true)}
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

      {showGenerateModal && (
        <GenerateModal
          quizId={quizId}
          activeRunId={activeRunId}
          generating={generateQuiz.isPending}
          onClose={() => {
            setShowGenerateModal(false);
            setActiveRunId(null);
          }}
          onStart={handleStartGeneration}
        />
      )}

      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-xl bg-m3-surface p-6 shadow-xl space-y-4">
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-xl bg-red-100 text-red-700 flex items-center justify-center shrink-0">
                <Trash2 className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <h2 className="font-headline font-bold text-base text-m3-on-surface">
                  Xoá bài kiểm tra này?
                </h2>
                <p className="text-sm text-m3-on-surface-variant">
                  Hành động này sẽ xoá vĩnh viễn bài kiểm tra{" "}
                  <span className="font-semibold">{quiz.title}</span>, các câu
                  hỏi, lượt làm bài và mục module liên quan. Không thể hoàn tác.
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
                Huỷ
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
                Xoá
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function QuestionsTab({
  quizId,
  questions,
  selectedIds,
  onToggleSelect,
  onSelectAll,
  onClearSelection,
  bulkSeconds,
  onBulkSecondsChange,
  onAddQuestion,
  addPending,
  onOpenGenerator,
}: {
  quizId: string;
  questions: QuizQuestionAuthoring[];
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onSelectAll: () => void;
  onClearSelection: () => void;
  bulkSeconds: string;
  onBulkSecondsChange: (value: string) => void;
  onAddQuestion: () => void | Promise<void>;
  addPending: boolean;
  onOpenGenerator: () => void;
}) {
  const bulkSet = useBulkSetExpectedTime(quizId);
  const pendingCount = questions.filter(
    (q) => q.review_status !== "approved",
  ).length;

  const missingExpectedTimeCount = questions.filter(
    (q) =>
      q.expected_response_time_ms == null || q.expected_response_time_ms <= 0,
  ).length;

  const secondsValue = Number(bulkSeconds);
  const bulkValid =
    selectedIds.size > 0 &&
    Number.isFinite(secondsValue) &&
    secondsValue > 0;

  async function handleApplyBulk() {
    try {
      const result = await bulkSet.mutateAsync({
        question_ids: Array.from(selectedIds),
        expected_seconds: secondsValue,
      });
      toast.success(
        `Đã đặt thời gian dự kiến cho ${result.updated} câu hỏi`,
      );
      onClearSelection();
    } catch (err: unknown) {
      toast.error(
        (err as Error).message || "Không thể đặt thời gian dự kiến",
      );
    }
  }

  return (
    <div className="grid grid-cols-12 gap-6">
      <div className="col-span-12 lg:col-span-8 space-y-4">
        {questions.length > 0 && missingExpectedTimeCount > 0 && (
          <div className="flex items-center gap-2 rounded-xl bg-amber-50 border border-amber-100 px-3 py-2 text-xs text-amber-800">
            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
            <span>
              <strong>{missingExpectedTimeCount}</strong> câu chưa có thời gian
              dự kiến. Cần đặt thời gian trước khi xuất bản.
            </span>
          </div>
        )}

        {questions.length > 0 && pendingCount > 0 && (
          <div className="flex items-center gap-2 rounded-xl bg-blue-50 border border-blue-100 px-3 py-2 text-xs text-blue-900">
            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
            <span>
              <strong>{pendingCount}</strong> câu hỏi đang chờ duyệt. Hãy duyệt
              trước khi xuất bản.
            </span>
          </div>
        )}

        <BulkSetExpectedTimeBar
          totalQuestions={questions.length}
          selectedCount={selectedIds.size}
          bulkSeconds={bulkSeconds}
          onBulkSecondsChange={onBulkSecondsChange}
          onSelectAll={onSelectAll}
          onClear={onClearSelection}
          onApply={handleApplyBulk}
          applyValid={bulkValid}
          applying={bulkSet.isPending}
        />

        {questions.length === 0 ? (
          <div className="rounded-xl border border-dashed border-m3-outline-variant/30 bg-m3-surface-container-lowest p-10 text-center space-y-3">
            <HelpCircle className="h-10 w-10 text-m3-outline-variant mx-auto" />
            <div>
              <p className="font-headline font-bold text-m3-on-surface">
                Chưa có câu hỏi
              </p>
              <p className="text-sm text-m3-on-surface-variant mt-1 max-w-md mx-auto">
                Thêm câu hỏi thủ công bên dưới hoặc dùng AI để tạo nhanh từ tài
                liệu bài học.
              </p>
            </div>
          </div>
        ) : (
          questions.map((question) => (
            <QuestionCard
              key={question.id}
              quizId={quizId}
              question={question}
              selected={selectedIds.has(question.id)}
              onToggleSelect={() => onToggleSelect(question.id)}
            />
          ))
        )}

        <button
          type="button"
          onClick={onAddQuestion}
          disabled={addPending}
          className="w-full flex items-center justify-center gap-2 border-2 border-dashed border-m3-outline-variant/40 rounded-xl px-6 py-4 text-sm font-bold text-m3-on-surface-variant hover:border-m3-primary hover:text-m3-primary hover:bg-m3-primary/5 transition-all disabled:opacity-60 cursor-pointer"
        >
          {addPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Plus className="h-4 w-4" />
          )}
          Thêm câu hỏi
        </button>
      </div>

      <div className="col-span-12 lg:col-span-4">
        <div className="lg:sticky lg:top-6 space-y-4">
          <div className="rounded-xl border border-m3-secondary/10 bg-m3-surface-container-low p-5 shadow-glass space-y-3">
            <div className="flex items-center gap-2">
              <div className="h-9 w-9 rounded-xl gradient-primary flex items-center justify-center shadow-ai-glow">
                <Sparkles className="h-5 w-5 text-white" />
              </div>
              <div>
                <h2 className="font-headline font-bold text-sm text-m3-on-surface">
                  Tạo bằng AI
                </h2>
                <p className="text-xs text-m3-on-surface-variant">
                  Sinh câu hỏi từ tài liệu bài học đã sẵn sàng.
                </p>
              </div>
            </div>
            <Button
              type="button"
              onClick={onOpenGenerator}
              className="w-full gap-2 gradient-primary text-white border-0 shadow-ai-glow"
            >
              <Sparkles className="h-4 w-4" />
              Mở trình tạo
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function BulkSetExpectedTimeBar({
  totalQuestions,
  selectedCount,
  bulkSeconds,
  onBulkSecondsChange,
  onSelectAll,
  onClear,
  onApply,
  applyValid,
  applying,
}: {
  totalQuestions: number;
  selectedCount: number;
  bulkSeconds: string;
  onBulkSecondsChange: (value: string) => void;
  onSelectAll: () => void;
  onClear: () => void;
  onApply: () => void | Promise<void>;
  applyValid: boolean;
  applying: boolean;
}) {
  if (totalQuestions === 0) return null;
  return (
    <div className="rounded-xl border border-m3-outline-variant/20 bg-m3-surface-container-lowest p-4 flex flex-col sm:flex-row sm:items-center gap-3 shadow-glass">
      <div className="flex items-center gap-2 text-sm text-m3-on-surface">
        <Clock className="h-4 w-4 text-m3-secondary" />
        <span className="font-bold">Đặt nhanh thời gian</span>
        <Badge className="border-0 bg-m3-surface-container-high text-m3-on-surface text-[11px] font-bold rounded-full px-2 py-0.5">
          {selectedCount}/{totalQuestions} đã chọn
        </Badge>
      </div>
      <div className="flex flex-1 items-center gap-2 min-w-0">
        <label className="text-xs font-bold uppercase tracking-widest text-m3-on-surface-variant whitespace-nowrap">
          Thời gian (giây)
        </label>
        <Input
          type="number"
          min={1}
          step={1}
          value={bulkSeconds}
          onChange={(e) => onBulkSecondsChange(e.target.value)}
          className="bg-m3-surface text-sm w-28"
        />
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onSelectAll}
          disabled={totalQuestions === 0}
        >
          Chọn tất cả
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onClear}
          disabled={selectedCount === 0}
        >
          Bỏ chọn
        </Button>
        <Button
          type="button"
          size="sm"
          disabled={!applyValid || applying}
          onClick={onApply}
          className="gap-2 gradient-primary text-white border-0"
        >
          {applying ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Save className="h-3.5 w-3.5" />
          )}
          Áp dụng cho đã chọn
        </Button>
      </div>
    </div>
  );
}

function QuestionCard({
  quizId,
  question,
  selected,
  onToggleSelect,
}: {
  quizId: string;
  question: QuizQuestionAuthoring;
  selected: boolean;
  onToggleSelect: () => void;
}) {
  const updateQuestion = useUpdateQuizQuestion(quizId, question.id);
  const deleteQuestion = useDeleteQuizQuestion(quizId, question.id);
  const regenerate = useRegenerateQuestion(quizId, question.id);

  const [draft, setDraft] = useState(() => buildQuestionDraft(question));
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    setDraft(buildQuestionDraft(question));
  }, [question]);

  const hasOptions =
    question.question_type === "multiple_choice" && draft.options.length > 0;
  const expectedSeconds =
    question.expected_response_time_ms == null
      ? null
      : Math.round(question.expected_response_time_ms / 1000);

  async function handleSave(reviewStatus = draft.review_status) {
    if (!draft.prompt_text.trim()) {
      toast.error("Cần điền nội dung câu hỏi");
      return;
    }
    if (hasOptions) {
      if (draft.options.some((o) => !o.option_text.trim())) {
        toast.error("Cần điền nội dung cho mọi đáp án");
        return;
      }
      if (draft.options.filter((o) => o.is_correct).length !== 1) {
        toast.error("Phải có đúng một đáp án đúng");
        return;
      }
    }
    try {
      await updateQuestion.mutateAsync({
        prompt_text: draft.prompt_text.trim(),
        explanation: draft.explanation.trim() || null,
        difficulty: draft.difficulty,
        bloom_level: draft.bloom_level,
        review_status: reviewStatus,
        ...(hasOptions
          ? {
              options: draft.options.map((o) => ({
                id: o.id,
                option_key: o.option_key,
                option_text: o.option_text.trim(),
                is_correct: o.is_correct,
              })),
            }
          : {}),
      });
      toast.success(
        reviewStatus === "approved" ? "Đã duyệt câu hỏi" : "Đã lưu câu hỏi",
      );
    } catch (err: unknown) {
      toast.error((err as Error).message || "Không thể lưu câu hỏi");
    }
  }

  async function handleDelete() {
    try {
      await deleteQuestion.mutateAsync();
      toast.success("Đã xoá câu hỏi");
    } catch (err: unknown) {
      toast.error((err as Error).message || "Không thể xoá câu hỏi");
    } finally {
      setConfirming(false);
    }
  }

  async function handleRegenerate() {
    try {
      await regenerate.mutateAsync();
      toast.success("Đang tái tạo câu hỏi");
    } catch (err: unknown) {
      if (err instanceof ApiError && err.status === 409) {
        toast.error("Một lần tái tạo khác đang chạy.");
        return;
      }
      toast.error((err as Error).message || "Không thể tái tạo câu hỏi");
    }
  }

  return (
    <div
      className={cn(
        "rounded-xl border bg-m3-surface p-4 space-y-3",
        selected
          ? "border-m3-primary shadow-sm"
          : "border-m3-outline-variant/20",
      )}
    >
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={selected}
            onChange={onToggleSelect}
            className="h-4 w-4"
          />
          <span className="sr-only">Chọn câu hỏi {question.position}</span>
        </label>
        <Badge className="border-0 bg-m3-primary-fixed text-m3-primary text-[10px]">
          Câu {question.position}
        </Badge>
        <Badge className="border-0 bg-blue-50 text-blue-800 text-[10px] capitalize">
          {question.question_type.replace("_", " ")}
        </Badge>
        <Badge
          className={cn(
            "border-0 text-[10px] capitalize",
            question.review_status === "approved"
              ? "bg-emerald-100 text-emerald-700"
              : "bg-amber-50 text-amber-700",
          )}
        >
          {question.review_status}
        </Badge>
        {expectedSeconds !== null ? (
          <Badge className="border-0 bg-m3-surface-container-high text-m3-on-surface text-[10px] gap-1">
            <Clock className="h-3 w-3" />
            {expectedSeconds}s
          </Badge>
        ) : (
          <Badge className="border-0 bg-amber-50 text-amber-700 text-[10px] gap-1">
            <Clock className="h-3 w-3" />
            Chưa đặt thời gian
          </Badge>
        )}
      </div>

      <div className="space-y-1.5">
        <label className="text-[10px] font-bold uppercase tracking-widest text-m3-on-surface-variant">
          Câu hỏi
        </label>
        <textarea
          value={draft.prompt_text}
          onChange={(e) =>
            setDraft((current) => ({ ...current, prompt_text: e.target.value }))
          }
          rows={3}
          className="w-full rounded-xl border border-m3-outline-variant/20 bg-m3-surface-container-lowest px-3 py-2.5 text-sm text-m3-on-surface resize-none focus:outline-none focus:ring-2 focus:ring-m3-secondary/30"
        />
      </div>

      {hasOptions && (
        <div className="space-y-2">
          <label className="text-[10px] font-bold uppercase tracking-widest text-m3-on-surface-variant">
            Đáp án
          </label>
          {draft.options.map((option, idx) => (
            <div
              key={option.id}
              className={cn(
                "flex items-center gap-2 rounded-xl px-3 py-2",
                option.is_correct
                  ? "border-2 border-emerald-300 bg-emerald-50/60"
                  : "border border-m3-outline-variant/20 bg-m3-surface-container-lowest",
              )}
            >
              <input
                type="radio"
                name={`correct-${question.id}`}
                checked={option.is_correct}
                onChange={() =>
                  setDraft((current) => ({
                    ...current,
                    options: current.options.map((o, j) => ({
                      ...o,
                      is_correct: j === idx,
                    })),
                  }))
                }
                className="h-4 w-4"
              />
              <span className="font-bold text-m3-on-surface-variant text-sm">
                {option.option_key}.
              </span>
              <input
                type="text"
                value={option.option_text}
                onChange={(e) =>
                  setDraft((current) => ({
                    ...current,
                    options: current.options.map((o, j) =>
                      j === idx ? { ...o, option_text: e.target.value } : o,
                    ),
                  }))
                }
                className="flex-1 bg-transparent text-sm text-m3-on-surface focus:outline-none"
              />
            </div>
          ))}
        </div>
      )}

      <div className="space-y-1.5">
        <label className="text-[10px] font-bold uppercase tracking-widest text-m3-on-surface-variant">
          Giải thích
        </label>
        <textarea
          value={draft.explanation}
          onChange={(e) =>
            setDraft((current) => ({ ...current, explanation: e.target.value }))
          }
          rows={2}
          className="w-full rounded-xl border border-m3-outline-variant/20 bg-m3-surface-container-lowest px-3 py-2.5 text-sm text-m3-on-surface resize-none focus:outline-none focus:ring-2 focus:ring-m3-secondary/30"
        />
      </div>

      <div className="flex flex-wrap items-center gap-2 pt-1">
        <Button
          type="button"
          size="sm"
          onClick={() => handleSave()}
          disabled={updateQuestion.isPending}
          className="gap-2"
        >
          {updateQuestion.isPending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Save className="h-3.5 w-3.5" />
          )}
          Lưu
        </Button>
        {question.review_status !== "approved" && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => handleSave("approved")}
            disabled={updateQuestion.isPending}
            className="gap-2 border-emerald-200 text-emerald-700 hover:bg-emerald-50 hover:text-emerald-700"
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            Duyệt
          </Button>
        )}
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={handleRegenerate}
          disabled={regenerate.isPending}
          className="gap-2"
        >
          {regenerate.isPending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <RefreshCw className="h-3.5 w-3.5" />
          )}
          Tái tạo
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => setConfirming(true)}
          disabled={deleteQuestion.isPending}
          className="gap-2 border-red-200 text-red-700 hover:bg-red-50 hover:text-red-700 ml-auto"
        >
          <Trash2 className="h-3.5 w-3.5" />
          Xoá
        </Button>
      </div>

      {confirming && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-3 text-xs text-red-800 flex flex-wrap items-center gap-2">
          <span>Xoá câu hỏi này? Không thể hoàn tác.</span>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => setConfirming(false)}
            disabled={deleteQuestion.isPending}
          >
            Huỷ
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={handleDelete}
            disabled={deleteQuestion.isPending}
            className="bg-red-600 text-white hover:bg-red-700 border-0 gap-2"
          >
            {deleteQuestion.isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Trash2 className="h-3.5 w-3.5" />
            )}
            Xoá
          </Button>
        </div>
      )}
    </div>
  );
}

interface QuestionDraft {
  prompt_text: string;
  explanation: string;
  difficulty: string;
  bloom_level: string;
  review_status: string;
  options: Array<{
    id: string;
    option_key: string;
    option_text: string;
    is_correct: boolean;
  }>;
}

function buildQuestionDraft(question: QuizQuestionAuthoring): QuestionDraft {
  return {
    prompt_text: question.prompt_text ?? "",
    explanation: question.explanation ?? "",
    difficulty: question.difficulty ?? "medium",
    bloom_level: question.bloom_level ?? "understand",
    review_status: question.review_status ?? "pending",
    options: (question.options ?? []).map((o) => ({
      id: o.id,
      option_key: o.option_key,
      option_text: o.option_text,
      is_correct: o.is_correct,
    })),
  };
}

function GenerateModal({
  quizId,
  activeRunId,
  generating,
  onClose,
  onStart,
}: {
  quizId: string;
  activeRunId: string | null;
  generating: boolean;
  onClose: () => void;
  onStart: (payload: {
    target_count: number;
    focus_topics: string[];
  }) => void | Promise<void>;
}) {
  const { data: run } = useQuizGenerationRun(quizId, activeRunId);
  const [targetCount, setTargetCount] = useState(5);
  const [focusInput, setFocusInput] = useState("");

  const status = run?.status;
  const isTerminal =
    status === "completed" ||
    status === "failed" ||
    status === "cancelled";
  const isRunning = !isTerminal && (Boolean(activeRunId) || generating);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (targetCount < 1 || targetCount > 50) {
      toast.error("Số lượng câu hỏi phải nằm trong khoảng 1-50");
      return;
    }
    const focus_topics = focusInput
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    void onStart({ target_count: targetCount, focus_topics });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-lg rounded-xl bg-m3-surface p-6 shadow-xl space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-xl gradient-primary flex items-center justify-center shadow-ai-glow shrink-0">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <div className="space-y-1">
              <h2 className="font-headline font-bold text-base text-m3-on-surface">
                Tạo câu hỏi bằng AI
              </h2>
              <p className="text-sm text-m3-on-surface-variant">
                Sinh câu hỏi từ tài liệu bài học đã được xử lý.
              </p>
            </div>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-8 w-8 shrink-0"
            title="Đóng"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {!activeRunId && (
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-widest text-m3-on-surface-variant">
                Số lượng câu hỏi
              </label>
              <Input
                type="number"
                min={1}
                max={50}
                value={targetCount}
                onChange={(e) =>
                  setTargetCount(
                    Math.max(1, Math.min(50, Number(e.target.value) || 1)),
                  )
                }
                className="bg-m3-surface text-sm w-32"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-widest text-m3-on-surface-variant">
                Chủ đề tập trung (tuỳ chọn)
              </label>
              <Input
                value={focusInput}
                onChange={(e) => setFocusInput(e.target.value)}
                placeholder="Ngăn cách bằng dấu phẩy"
                className="bg-m3-surface text-sm"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={generating}
              >
                Huỷ
              </Button>
              <Button
                type="submit"
                disabled={generating}
                className="gap-2 gradient-primary text-white border-0"
              >
                {generating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4" />
                )}
                Bắt đầu tạo
              </Button>
            </div>
          </form>
        )}

        {activeRunId && isRunning && (
          <RunProgress run={run} />
        )}

        {activeRunId && status === "completed" && (
          <RunSucceeded run={run} onClose={onClose} />
        )}

        {activeRunId && (status === "failed" || status === "cancelled") && (
          <RunFailed run={run} onClose={onClose} />
        )}
      </div>
    </div>
  );
}

function RunProgress({ run }: { run: GenerationRunRead | undefined }) {
  return (
    <div className="space-y-3 text-center py-6">
      <div className="flex justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-m3-secondary" />
      </div>
      <p className="font-headline font-bold text-m3-on-surface">
        Đang tạo câu hỏi…
      </p>
      <p className="text-sm text-m3-on-surface-variant">
        {run?.status === "running"
          ? "AI đang phân tích tài liệu và soạn câu hỏi."
          : "Đang xếp hàng đợi…"}
      </p>
      <div className="h-2 rounded-full bg-m3-surface-container-high overflow-hidden">
        <div className="h-full w-1/2 gradient-primary animate-pulse" />
      </div>
    </div>
  );
}

function RunSucceeded({
  run,
  onClose,
}: {
  run: GenerationRunRead | undefined;
  onClose: () => void;
}) {
  void run;
  return (
    <div className="space-y-4 text-center py-4">
      <div className="flex justify-center">
        <div className="h-12 w-12 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
          <CheckCircle2 className="h-6 w-6" />
        </div>
      </div>
      <p className="font-headline font-bold text-m3-on-surface">
        Đã tạo xong câu hỏi
      </p>
      <p className="text-sm text-m3-on-surface-variant">
        Danh sách câu hỏi đã được làm mới.
      </p>
      <div className="flex justify-center pt-2">
        <Button type="button" onClick={onClose} className="gap-2">
          <CheckCircle2 className="h-4 w-4" />
          Đóng
        </Button>
      </div>
    </div>
  );
}

function RunFailed({
  run,
  onClose,
}: {
  run: GenerationRunRead | undefined;
  onClose: () => void;
}) {
  return (
    <div className="space-y-4 py-4">
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 flex items-start gap-2">
        <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
        <div>
          <p className="font-bold">Tạo câu hỏi thất bại</p>
          <p className="mt-1">
            {run?.error_message ??
              "Đã có lỗi xảy ra. Hãy thử lại sau ít phút."}
          </p>
        </div>
      </div>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onClose}>
          Đóng
        </Button>
      </div>
    </div>
  );
}

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
  function update<K extends keyof SettingsDraft>(
    key: K,
    value: SettingsDraft[K],
  ) {
    setDraft((current) => (current ? { ...current, [key]: value } : current));
  }

  return (
    <form
      onSubmit={onSubmit}
      className="bg-m3-surface-container-lowest border border-m3-outline-variant/20 rounded-xl p-6 lg:p-8 space-y-8 shadow-glass"
    >
      <SettingsSection
        title="Thông tin chung"
        description="Đặt tên và mô tả để học viên dễ nhận biết."
      >
        <Field label="Tiêu đề bài kiểm tra">
          <Input
            value={draft.title}
            onChange={(e) => update("title", e.target.value)}
            placeholder="Nhập tiêu đề…"
            className="bg-m3-surface text-sm"
          />
        </Field>
        <Field label="Mô tả">
          <textarea
            value={draft.description}
            onChange={(e) => update("description", e.target.value)}
            rows={3}
            placeholder="Tóm tắt nội dung bài kiểm tra…"
            className="w-full rounded-xl border border-m3-outline-variant/20 bg-m3-surface px-3 py-2.5 text-sm text-m3-on-surface resize-none focus:outline-none focus:ring-2 focus:ring-m3-secondary/30"
          />
        </Field>
      </SettingsSection>

      <SettingsSection title="Điểm số & Thời gian">
        <Field
          label={
            <span className="flex items-center justify-between">
              <span>Điểm đậu</span>
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
            onChange={(e) =>
              update("passing_score_percent", Number(e.target.value))
            }
            className="w-full h-2 rounded-full cursor-pointer accent-[var(--m3-primary)]"
          />
        </Field>
        <Field label="Thời gian (phút)" hint="Để trống nếu không giới hạn.">
          <Input
            type="number"
            min={1}
            max={180}
            value={draft.time_limit_minutes}
            onChange={(e) => update("time_limit_minutes", e.target.value)}
            placeholder="Ví dụ: 30"
            className="bg-m3-surface text-sm w-40"
          />
        </Field>
      </SettingsSection>

      <SettingsSection title="Số lần làm">
        <ToggleRow
          label="Cho phép làm lại"
          description="Học viên có thể làm lại sau khi nộp."
          value={draft.allow_retakes}
          onChange={(v) => update("allow_retakes", v)}
        />
        {draft.allow_retakes && (
          <div className="ml-1 pl-4 border-l-2 border-m3-primary/30 grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
            <Field label="Số lần tối đa" hint="Để trống = không giới hạn.">
              <Input
                type="number"
                min={1}
                value={draft.max_attempts}
                onChange={(e) => update("max_attempts", e.target.value)}
                placeholder="Ví dụ: 3"
                className="bg-m3-surface text-sm"
              />
            </Field>
            <Field label="Cooldown (giờ)" hint="Khoảng chờ giữa các lần.">
              <Input
                type="number"
                min={0}
                value={draft.cooldown_hours}
                onChange={(e) => update("cooldown_hours", e.target.value)}
                placeholder="Tuỳ chọn"
                className="bg-m3-surface text-sm"
              />
            </Field>
          </div>
        )}
      </SettingsSection>

      <SettingsSection title="Hành vi">
        <ToggleRow
          label="Xáo trộn câu hỏi"
          description="Hoán đổi thứ tự câu hỏi theo từng lần làm."
          value={draft.shuffle_questions}
          onChange={(v) => update("shuffle_questions", v)}
        />
        <ToggleRow
          label="Xáo trộn đáp án"
          description="Hoán đổi thứ tự đáp án trong mỗi câu hỏi."
          value={draft.shuffle_options}
          onChange={(v) => update("shuffle_options", v)}
        />
        <ToggleRow
          label="Hiển thị gợi ý"
          description="Cho phép học viên xem gợi ý trong khi làm."
          value={draft.show_hints}
          onChange={(v) => update("show_hints", v)}
        />
        <ToggleRow
          label="Nhắc ôn tập"
          description="Gửi nhắc nhở khi đến lúc ôn lại bài."
          value={draft.reminders_enabled}
          onChange={(v) => update("reminders_enabled", v)}
        />
      </SettingsSection>

      <SettingsSection
        title="Lặp lại ngắt quãng"
        description="Tinh chỉnh tham số SM2. Khoảng 1.3 – 5.0."
      >
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Field label="EF khởi đầu">
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
          <Field label="Ngưỡng EF mở khoá">
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
          <Field label="Coverage (%)">
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
          Lưu cấu hình
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
        <p className="text-xs text-m3-on-surface-variant mt-0.5">
          {description}
        </p>
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
            value ? "left-6 bg-surface-elev" : "left-1 bg-slate-400",
          )}
        />
      </button>
    </div>
  );
}

function PreviewTab({
  quiz,
  questions,
}: {
  quiz: QuizAuthoring;
  questions: QuizQuestionAuthoring[];
}) {
  return (
    <div className="bg-m3-surface-container-lowest border border-m3-outline-variant/20 rounded-xl p-6 lg:p-8 space-y-6 shadow-glass">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h2 className="font-headline font-extrabold text-xl text-m3-on-surface">
            Xem trước cho học viên
          </h2>
          <p className="text-sm text-m3-on-surface-variant mt-1">
            {quiz.title} — bản chỉ đọc, mô phỏng giao diện học viên.
          </p>
        </div>
        <Badge className="border border-m3-outline-variant/40 bg-m3-surface-container-low text-m3-on-surface-variant rounded-full text-[11px] font-medium px-3 py-1 self-start sm:self-auto">
          Chỉ đọc
        </Badge>
      </div>

      {questions.length === 0 ? (
        <div className="text-center py-16 text-m3-on-surface-variant space-y-1">
          <HelpCircle className="h-8 w-8 mx-auto text-m3-outline-variant" />
          <p className="text-base font-bold">Chưa có câu hỏi</p>
          <p className="text-sm">
            Thêm câu hỏi trong tab Câu hỏi hoặc dùng AI để tạo nhanh.
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
  question: QuizQuestionAuthoring;
}) {
  const hasOptions =
    question.question_type === "multiple_choice" && question.options.length > 0;

  return (
    <div className="rounded-xl bg-m3-surface-container-low border border-m3-outline-variant/15 p-5 space-y-3">
      <div className="flex items-start gap-3">
        <span className="shrink-0 h-7 w-7 rounded-full gradient-primary text-white flex items-center justify-center text-xs font-extrabold">
          {index + 1}
        </span>
        <p className="text-sm font-semibold text-m3-on-surface leading-relaxed">
          {question.prompt_text || (
            <span className="italic text-m3-on-surface-variant">
              (Chưa có nội dung)
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
                    (Chưa có nội dung)
                  </span>
                )}
              </span>
              {opt.is_correct && (
                <span className="text-[10px] font-bold uppercase tracking-wide text-emerald-700">
                  Đúng
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      {question.explanation && (
        <div className="pl-10">
          <p className="text-xs text-m3-on-surface-variant bg-m3-surface-container rounded-xl px-3 py-2 italic">
            <span className="font-bold not-italic">Giải thích: </span>
            {question.explanation}
          </p>
        </div>
      )}
    </div>
  );
}
