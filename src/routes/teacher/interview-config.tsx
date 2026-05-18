import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "@tanstack/react-router";
import {
  ArrowLeft,
  ArrowRight,
  Brain,
  CheckCircle2,
  HelpCircle,
  Loader2,
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
import {
  useDeleteInterviewConfig,
  useGenerateInterviewQuestions,
  useInterviewConfig,
  useInterviewGenerationRun,
  usePublishInterviewConfig,
  useUpdateInterviewConfig,
} from "@/lib/api/hooks/interviews";
import {
  useTeacherCourseById,
  useTeacherCourseContent,
} from "@/lib/api/hooks/teacher-courses";
import type {
  InterviewConfigAuthoring,
  InterviewConfigUpdate,
  InterviewGenerationRequest,
} from "@/lib/api/types";
import { cn } from "@/lib/utils";

type SupportedMode = NonNullable<InterviewConfigUpdate["supported_modes"]>;
type Persona = NonNullable<InterviewConfigUpdate["persona"]>;
type GenerationMode = InterviewGenerationRequest["mode"];

interface SettingsDraft {
  title: string;
  persona: Persona;
  supported_modes: SupportedMode;
  time_limit_minutes: string;
  max_attempts: string;
  min_outcomes_to_pass: string;
  lock_quiz_ef_until_pass: boolean;
  supplementary_instructions: string;
}

function draftFromConfig(config: InterviewConfigAuthoring): SettingsDraft {
  return {
    title: config.title ?? "",
    persona: (config.persona ?? "neutral") as Persona,
    supported_modes: config.supported_modes,
    time_limit_minutes:
      config.time_limit_minutes == null ? "" : String(config.time_limit_minutes),
    max_attempts:
      config.max_attempts == null ? "" : String(config.max_attempts),
    min_outcomes_to_pass:
      config.min_outcomes_to_pass == null
        ? ""
        : String(config.min_outcomes_to_pass),
    lock_quiz_ef_until_pass: config.lock_quiz_ef_until_pass,
    supplementary_instructions: config.supplementary_instructions ?? "",
  };
}

function integerOrNull(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? Math.round(parsed) : null;
}

const PERSONA_LABELS: Record<Persona, string> = {
  strict: "Nghiêm khắc",
  neutral: "Trung lập",
  supportive: "Hỗ trợ",
};

const MODE_LABELS: Record<SupportedMode, string> = {
  hybrid: "Văn bản + giọng nói",
  text: "Chỉ văn bản",
  voice: "Chỉ giọng nói",
};

const STATUS_LABELS: Record<InterviewConfigAuthoring["status"], string> = {
  draft: "Bản nháp",
  published: "Đã xuất bản",
  archived: "Đã lưu trữ",
};

export default function InterviewConfigPage() {
  const navigate = useNavigate();
  const { courseId, configId } = useParams({ strict: false }) as {
    courseId: string;
    configId: string;
  };

  const { data: course } = useTeacherCourseById(courseId);
  const { data: content } = useTeacherCourseContent(courseId);
  const { data: config, isLoading: configLoading } =
    useInterviewConfig(configId);

  const courseModule = useMemo(
    () => content?.modules.find((m) => m.id === config?.module_id),
    [content, config?.module_id],
  );

  const updateConfig = useUpdateInterviewConfig(configId);
  const publishConfig = usePublishInterviewConfig(configId);
  const deleteConfig = useDeleteInterviewConfig(configId);

  const [draft, setDraft] = useState<SettingsDraft | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [generationOpen, setGenerationOpen] = useState(false);
  const [activeRunId, setActiveRunId] = useState<string | null>(null);

  useEffect(() => {
    if (config) setDraft(draftFromConfig(config));
  }, [config]);

  if (configLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-m3-secondary" />
      </div>
    );
  }

  if (!config) {
    return (
      <div className="text-center py-24 text-m3-on-surface-variant space-y-4">
        <div className="flex justify-center">
          <div className="h-12 w-12 rounded-xl bg-blue-100 text-blue-800 flex items-center justify-center">
            <HelpCircle className="h-6 w-6" />
          </div>
        </div>
        <div>
          <p className="font-headline font-bold text-m3-on-surface">
            Không tìm thấy bộ phỏng vấn
          </p>
          <p className="text-sm mt-1">
            Bộ câu hỏi phỏng vấn không tải được cho khoá học này.
          </p>
        </div>
        <Link
          to="/teacher/courses/$courseId"
          params={{ courseId }}
          className="inline-flex"
        >
          <Button variant="outline" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Quay lại khoá học
          </Button>
        </Link>
      </div>
    );
  }

  const isPublished = config.status === "published";
  const isArchived = config.status === "archived";
  const draftCount = config.draft_question_count ?? 0;
  const publishDisabled =
    publishConfig.isPending || isPublished || draftCount === 0;

  function returnToCourse() {
    void navigate({
      to: "/teacher/courses/$courseId",
      params: { courseId },
    });
  }

  async function handleSaveSettings(event: React.FormEvent) {
    event.preventDefault();
    if (!draft) return;
    if (!draft.title.trim()) {
      toast.error("Tiêu đề không được để trống");
      return;
    }
    try {
      await updateConfig.mutateAsync({
        title: draft.title.trim(),
        persona: draft.persona,
        supported_modes: draft.supported_modes,
        time_limit_minutes: integerOrNull(draft.time_limit_minutes),
        max_attempts: integerOrNull(draft.max_attempts),
        min_outcomes_to_pass: integerOrNull(draft.min_outcomes_to_pass),
        lock_quiz_ef_until_pass: draft.lock_quiz_ef_until_pass,
        supplementary_instructions:
          draft.supplementary_instructions.trim() || null,
      });
      toast.success("Đã lưu cấu hình");
    } catch (err: unknown) {
      toast.error((err as Error).message || "Lưu cấu hình thất bại");
    }
  }

  async function handlePublish() {
    if (publishDisabled) return;
    try {
      await publishConfig.mutateAsync();
      toast.success("Đã xuất bản phỏng vấn");
    } catch (err: unknown) {
      const message = (err as Error).message || "";
      if (
        draftCount === 0 ||
        /question|insufficient|empty/i.test(message)
      ) {
        toast.error("Tạo câu hỏi trước khi xuất bản");
      } else {
        toast.error(message || "Xuất bản thất bại");
      }
    }
  }

  async function handleArchive() {
    try {
      await updateConfig.mutateAsync({ status: "archived" });
      toast.success("Đã lưu trữ phỏng vấn");
    } catch (err: unknown) {
      toast.error((err as Error).message || "Lưu trữ thất bại");
    }
  }

  async function handleDelete() {
    try {
      await deleteConfig.mutateAsync();
      toast.success("Đã xoá phỏng vấn");
      returnToCourse();
    } catch (err: unknown) {
      toast.error((err as Error).message || "Xoá thất bại");
    } finally {
      setConfirmDelete(false);
    }
  }

  return (
    <div className="space-y-6 pb-12 max-w-[1400px] mx-auto">
      <div className="flex items-center gap-1.5 text-xs text-m3-on-surface-variant flex-wrap">
        <Link
          to="/teacher/courses"
          className="hover:text-m3-primary transition-colors"
        >
          Khoá của tôi
        </Link>
        <ArrowRight className="h-3 w-3" />
        <Link
          to="/teacher/courses/$courseId"
          params={{ courseId }}
          className="hover:text-m3-primary transition-colors truncate max-w-[160px]"
        >
          {course?.title ?? "…"}
        </Link>
        {courseModule && (
          <>
            <ArrowRight className="h-3 w-3" />
            <span className="truncate max-w-[160px]">{courseModule.title}</span>
          </>
        )}
        <ArrowRight className="h-3 w-3" />
        <span className="text-m3-on-surface font-medium truncate max-w-[220px]">
          {config.title}
        </span>
      </div>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex items-start gap-3 min-w-0 flex-1">
          <Link to="/teacher/courses/$courseId" params={{ courseId }}>
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 mt-1 shrink-0"
              title="Quay lại khoá học"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>

          <div className="min-w-0 flex-1 space-y-2">
            <h1 className="text-3xl lg:text-4xl font-extrabold font-headline tracking-tight text-gradient-primary leading-tight">
              {config.title}
            </h1>
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="border border-m3-outline-variant/30 bg-m3-surface-container-low text-m3-on-surface-variant rounded-full text-[11px] font-bold px-2.5 py-1">
                {draftCount} câu hỏi
              </Badge>
              {isPublished ? (
                <Badge className="border-0 bg-emerald-100 text-emerald-700 text-[11px] font-bold gap-1.5 rounded-full px-2.5 py-1">
                  <CheckCircle2 className="h-3 w-3" />
                  {STATUS_LABELS.published}
                </Badge>
              ) : isArchived ? (
                <Badge className="border-0 bg-slate-100 text-slate-700 text-[11px] font-bold rounded-full px-2.5 py-1">
                  {STATUS_LABELS.archived}
                </Badge>
              ) : (
                <Badge className="border-0 bg-amber-50 text-amber-700 text-[11px] font-bold rounded-full px-2.5 py-1">
                  {STATUS_LABELS.draft}
                </Badge>
              )}
              <AIInsightChip>Phỏng vấn AI</AIInsightChip>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap shrink-0">
          <Button
            type="button"
            onClick={() => setGenerationOpen(true)}
            className="gap-2 border-0 shadow-glass gradient-primary text-white hover:shadow-ai-glow"
          >
            <Sparkles className="h-4 w-4" />
            Tạo câu hỏi bằng AI
          </Button>
          <Button
            type="button"
            disabled={publishDisabled}
            onClick={handlePublish}
            className={cn(
              "gap-2 border-0 shadow-glass",
              isPublished
                ? "bg-emerald-600 text-white hover:bg-emerald-600 cursor-default"
                : "bg-m3-primary text-white hover:bg-m3-primary/90",
            )}
            title={
              draftCount === 0
                ? "Tạo câu hỏi trước khi xuất bản"
                : isPublished
                  ? "Đã xuất bản"
                  : "Xuất bản phỏng vấn"
            }
          >
            {publishConfig.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : isPublished ? (
              <CheckCircle2 className="h-4 w-4" />
            ) : (
              <Upload className="h-4 w-4" />
            )}
            {isPublished ? "Đã xuất bản" : "Xuất bản"}
          </Button>
          {!isArchived && (
            <Button
              type="button"
              variant="outline"
              className="gap-2"
              onClick={handleArchive}
              disabled={updateConfig.isPending}
            >
              Lưu trữ
            </Button>
          )}
          <Button
            type="button"
            variant="outline"
            className="gap-2 border-red-200 text-red-700 hover:bg-red-50 hover:text-red-700"
            onClick={() => setConfirmDelete(true)}
            disabled={deleteConfig.isPending}
            title="Xoá vĩnh viễn bộ phỏng vấn này"
          >
            <Trash2 className="h-4 w-4" />
            Xoá
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12 lg:col-span-8">
          {draft && (
            <SettingsForm
              draft={draft}
              setDraft={setDraft}
              onSubmit={handleSaveSettings}
              saving={updateConfig.isPending}
            />
          )}
        </div>

        <div className="col-span-12 lg:col-span-4">
          <div className="lg:sticky lg:top-6 space-y-4">
            <QuestionsSummaryCard
              draftCount={draftCount}
              importanceWeight={config.total_importance_weight}
              onGenerate={() => setGenerationOpen(true)}
            />
          </div>
        </div>
      </div>

      {generationOpen && (
        <GenerationModal
          configId={configId}
          courseId={courseId}
          moduleId={config.module_id}
          activeRunId={activeRunId}
          setActiveRunId={setActiveRunId}
          onClose={() => setGenerationOpen(false)}
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
                  Xoá phỏng vấn này?
                </h2>
                <p className="text-sm text-m3-on-surface-variant">
                  Hành động này sẽ xoá vĩnh viễn{" "}
                  <span className="font-semibold">{config.title}</span> cùng các
                  câu hỏi và bản ghi liên quan.
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setConfirmDelete(false)}
                disabled={deleteConfig.isPending}
              >
                Huỷ
              </Button>
              <Button
                type="button"
                onClick={handleDelete}
                disabled={deleteConfig.isPending}
                className="bg-red-600 text-white hover:bg-red-700 border-0 gap-2"
              >
                {deleteConfig.isPending ? (
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

function SettingsForm({
  draft,
  setDraft,
  onSubmit,
  saving,
}: {
  draft: SettingsDraft;
  setDraft: React.Dispatch<React.SetStateAction<SettingsDraft | null>>;
  onSubmit: (event: React.FormEvent) => void;
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
      <Section
        title="Thông tin chung"
        description="Tên và mô tả ngắn để học viên nhận biết bộ phỏng vấn này."
      >
        <Field label="Tiêu đề">
          <Input
            value={draft.title}
            onChange={(e) => update("title", e.target.value)}
            placeholder="Nhập tiêu đề phỏng vấn…"
            className="bg-m3-surface text-sm"
          />
        </Field>
      </Section>

      <Section title="Phong cách & Hình thức">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Phong cách AI">
            <select
              value={draft.persona}
              onChange={(e) => update("persona", e.target.value as Persona)}
              className="w-full rounded-xl border border-m3-outline-variant/20 bg-m3-surface px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-m3-secondary/30"
            >
              {(Object.keys(PERSONA_LABELS) as Persona[]).map((p) => (
                <option key={p} value={p}>
                  {PERSONA_LABELS[p]}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Hình thức trả lời">
            <select
              value={draft.supported_modes}
              onChange={(e) =>
                update("supported_modes", e.target.value as SupportedMode)
              }
              className="w-full rounded-xl border border-m3-outline-variant/20 bg-m3-surface px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-m3-secondary/30"
            >
              {(Object.keys(MODE_LABELS) as SupportedMode[]).map((m) => (
                <option key={m} value={m}>
                  {MODE_LABELS[m]}
                </option>
              ))}
            </select>
          </Field>
        </div>
      </Section>

      <Section title="Quy tắc làm bài">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Field label="Thời lượng (phút)" hint="Để trống = không giới hạn">
            <Input
              type="number"
              min={1}
              max={180}
              value={draft.time_limit_minutes}
              onChange={(e) => update("time_limit_minutes", e.target.value)}
              placeholder="VD: 30"
              className="bg-m3-surface text-sm"
            />
          </Field>
          <Field label="Số lần thử" hint="Để trống = không giới hạn">
            <Input
              type="number"
              min={1}
              value={draft.max_attempts}
              onChange={(e) => update("max_attempts", e.target.value)}
              placeholder="VD: 3"
              className="bg-m3-surface text-sm"
            />
          </Field>
          <Field
            label="Số tiêu chí cần đạt"
            hint="Số rubric outcome tối thiểu để vượt qua"
          >
            <Input
              type="number"
              min={1}
              value={draft.min_outcomes_to_pass}
              onChange={(e) => update("min_outcomes_to_pass", e.target.value)}
              placeholder="VD: 2"
              className="bg-m3-surface text-sm"
            />
          </Field>
        </div>

        <ToggleRow
          label="Khoá nâng EF của quiz đến khi đạt"
          description="Học viên phải vượt phỏng vấn trước khi spaced repetition tăng khoảng cách ôn tập."
          value={draft.lock_quiz_ef_until_pass}
          onChange={(v) => update("lock_quiz_ef_until_pass", v)}
        />
      </Section>

      <Section
        title="Hướng dẫn cho AI"
        description="Gợi ý phong cách câu hỏi, chủ đề trọng tâm hoặc lỗi cần tránh."
      >
        <Field label="Hướng dẫn bổ sung">
          <textarea
            value={draft.supplementary_instructions}
            onChange={(e) =>
              update("supplementary_instructions", e.target.value)
            }
            rows={4}
            placeholder="VD: Tập trung vào tình huống thực tế, tránh câu hỏi học thuộc lòng…"
            className="w-full rounded-xl border border-m3-outline-variant/20 bg-m3-surface px-3 py-2.5 text-sm text-m3-on-surface resize-none focus:outline-none focus:ring-2 focus:ring-m3-secondary/30"
          />
        </Field>
      </Section>

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

function QuestionsSummaryCard({
  draftCount,
  importanceWeight,
  onGenerate,
}: {
  draftCount: number;
  importanceWeight: number | null | undefined;
  onGenerate: () => void;
}) {
  return (
    <div className="rounded-xl border border-m3-outline-variant/20 bg-m3-surface-container-lowest p-5 shadow-glass space-y-4">
      <div className="flex items-center gap-2">
        <div className="h-9 w-9 rounded-xl gradient-primary flex items-center justify-center shadow-ai-glow shrink-0">
          <Brain className="h-5 w-5 text-white" />
        </div>
        <div>
          <h3 className="font-headline font-bold text-sm text-m3-on-surface">
            Câu hỏi & Tiêu chí
          </h3>
          <p className="text-[11px] text-m3-on-surface-variant">
            Sinh hàng loạt từ tài liệu khoá học bằng AI.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 text-center">
        <div className="rounded-xl bg-m3-surface-container-low p-3">
          <p className="text-[10px] uppercase font-bold text-m3-on-surface-variant tracking-widest">
            Câu hỏi
          </p>
          <p className="text-2xl font-extrabold font-headline text-m3-primary mt-1">
            {draftCount}
          </p>
        </div>
        <div className="rounded-xl bg-m3-surface-container-low p-3">
          <p className="text-[10px] uppercase font-bold text-m3-on-surface-variant tracking-widest">
            Tổng trọng số
          </p>
          <p className="text-2xl font-extrabold font-headline text-m3-on-surface mt-1">
            {importanceWeight == null
              ? "—"
              : Number(importanceWeight).toFixed(1)}
          </p>
        </div>
      </div>

      <Button
        type="button"
        onClick={onGenerate}
        className="w-full gap-2 gradient-primary text-white border-0 hover:shadow-ai-glow"
      >
        <Sparkles className="h-4 w-4" />
        Mở trình tạo AI
      </Button>

      {draftCount === 0 && (
        <p className="text-[11px] text-amber-700 bg-amber-50 rounded-xl px-3 py-2 leading-relaxed">
          Chưa có câu hỏi nào. Tạo câu hỏi trước khi xuất bản phỏng vấn.
        </p>
      )}
    </div>
  );
}

function GenerationModal({
  configId,
  courseId,
  moduleId,
  activeRunId,
  setActiveRunId,
  onClose,
}: {
  configId: string;
  courseId: string;
  moduleId: string;
  activeRunId: string | null;
  setActiveRunId: (runId: string | null) => void;
  onClose: () => void;
}) {
  const generate = useGenerateInterviewQuestions(configId);
  const { data: run } = useInterviewGenerationRun(configId, activeRunId);

  const [form, setForm] = useState({
    mode: "outcome-based" as GenerationMode,
    question_count: 5,
    focus_topics: "",
    avoid_topics: "",
    persona: "neutral" as Persona,
    supplementary_instructions: "",
  });

  const inProgress =
    generate.isPending ||
    Boolean(
      activeRunId &&
        (!run || run.status === "pending" || run.status === "running"),
    );
  const failed = run?.status === "failed";
  const completed = run?.status === "completed";

  function splitTopics(value: string): string[] {
    return value
      .split(/[,\n]/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
  }

  async function handleGenerate(event: React.FormEvent) {
    event.preventDefault();
    try {
      const result = await generate.mutateAsync({
        mode: form.mode,
        course_id: courseId,
        module_id: moduleId,
        question_count: form.question_count,
        focus_topics: splitTopics(form.focus_topics),
        avoid_topics: splitTopics(form.avoid_topics),
        source_lesson_ids: [],
        persona: form.persona,
        supplementary_instructions:
          form.supplementary_instructions.trim() || null,
      });
      setActiveRunId(result.run_id);
      toast.success("Đang tạo câu hỏi…");
    } catch (err: unknown) {
      toast.error((err as Error).message || "Không thể bắt đầu sinh câu hỏi");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-2xl rounded-xl bg-m3-surface shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-start justify-between gap-3 px-6 pt-6 pb-3 border-b border-m3-outline-variant/20">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl gradient-primary flex items-center justify-center shadow-ai-glow shrink-0">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="font-headline font-bold text-base text-m3-on-surface">
                Tạo câu hỏi bằng AI
              </h2>
              <p className="text-xs text-m3-on-surface-variant">
                AI sẽ sinh câu hỏi phỏng vấn dựa trên tiêu chí của module.
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            type="button"
            onClick={onClose}
            className="h-8 w-8"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <form onSubmit={handleGenerate} className="p-6 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Chế độ sinh">
              <select
                value={form.mode}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    mode: e.target.value as GenerationMode,
                  }))
                }
                className="w-full rounded-xl border border-m3-outline-variant/20 bg-m3-surface-container-low px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-m3-secondary/30"
              >
                <option value="outcome-based">Theo tiêu chí (rubric)</option>
                <option value="topic">Theo chủ đề</option>
                <option value="coverage">Bao phủ tài liệu</option>
              </select>
            </Field>
            <Field label="Số câu hỏi">
              <Input
                type="number"
                min={1}
                max={20}
                value={form.question_count}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    question_count: Math.max(1, Number(e.target.value) || 1),
                  }))
                }
                className="bg-m3-surface-container-low text-sm"
              />
            </Field>
          </div>

          <Field label="Phong cách AI">
            <select
              value={form.persona}
              onChange={(e) =>
                setForm((f) => ({ ...f, persona: e.target.value as Persona }))
              }
              className="w-full rounded-xl border border-m3-outline-variant/20 bg-m3-surface-container-low px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-m3-secondary/30"
            >
              {(Object.keys(PERSONA_LABELS) as Persona[]).map((p) => (
                <option key={p} value={p}>
                  {PERSONA_LABELS[p]}
                </option>
              ))}
            </select>
          </Field>

          <Field
            label="Chủ đề trọng tâm"
            hint="Các chủ đề muốn AI tập trung. Cách nhau bằng dấu phẩy."
          >
            <Input
              value={form.focus_topics}
              onChange={(e) =>
                setForm((f) => ({ ...f, focus_topics: e.target.value }))
              }
              placeholder="VD: thuật toán, cấu trúc dữ liệu"
              className="bg-m3-surface-container-low text-sm"
            />
          </Field>

          <Field
            label="Chủ đề cần tránh"
            hint="Các chủ đề không muốn xuất hiện."
          >
            <Input
              value={form.avoid_topics}
              onChange={(e) =>
                setForm((f) => ({ ...f, avoid_topics: e.target.value }))
              }
              placeholder="VD: thư viện đã lỗi thời"
              className="bg-m3-surface-container-low text-sm"
            />
          </Field>

          <Field label="Hướng dẫn bổ sung">
            <textarea
              value={form.supplementary_instructions}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  supplementary_instructions: e.target.value,
                }))
              }
              rows={3}
              placeholder="Hướng dẫn riêng cho lần sinh này…"
              className="w-full rounded-xl border border-m3-outline-variant/20 bg-m3-surface-container-low px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-m3-secondary/30"
            />
          </Field>

          {activeRunId && (
            <div
              className={cn(
                "rounded-xl px-4 py-3 text-sm border",
                failed
                  ? "border-red-200 bg-red-50 text-red-800"
                  : completed
                    ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                    : "border-blue-200 bg-blue-50 text-blue-800",
              )}
            >
              <div className="flex items-center gap-2 font-bold">
                {inProgress ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : failed ? (
                  <X className="h-4 w-4" />
                ) : (
                  <CheckCircle2 className="h-4 w-4" />
                )}
                {inProgress
                  ? "Đang sinh câu hỏi…"
                  : failed
                    ? "Sinh câu hỏi thất bại"
                    : "Hoàn thành"}
              </div>
              {failed && run?.failure_message && (
                <p className="mt-1 text-xs">{run.failure_message}</p>
              )}
              {completed && (
                <p className="mt-1 text-xs">
                  Câu hỏi mới đã được thêm vào bộ nháp. Đóng cửa sổ để xem.
                </p>
              )}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2 border-t border-m3-outline-variant/20">
            <Button type="button" variant="outline" onClick={onClose}>
              Đóng
            </Button>
            <Button
              type="submit"
              disabled={inProgress}
              className="gap-2 gradient-primary text-white border-0 hover:shadow-ai-glow"
            >
              {inProgress ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              {inProgress ? "Đang xử lý…" : "Bắt đầu sinh"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Section({
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
            value ? "left-6 bg-white" : "left-1 bg-slate-400",
          )}
        />
      </button>
    </div>
  );
}
