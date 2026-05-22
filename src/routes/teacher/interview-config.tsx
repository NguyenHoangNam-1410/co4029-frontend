import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
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
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
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

const PERSONA_KEYS: Persona[] = ["strict", "neutral", "supportive"];
const MODE_KEYS: SupportedMode[] = ["hybrid", "text", "voice"];

export default function InterviewConfigPage() {
  const { t } = useTranslation();
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
            {t("teacher_interview_config.errors.not_found_title")}
          </p>
          <p className="text-sm mt-1">
            {t("teacher_interview_config.errors.not_found_body")}
          </p>
        </div>
        <Link
          to="/teacher/courses/$courseId"
          params={{ courseId }}
          className="inline-flex"
        >
          <Button variant="outline" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            {t("teacher_interview_config.errors.back_to_course")}
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
      toast.error(t("teacher_interview_config.errors.title_required"));
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
      toast.success(t("teacher_interview_config.toasts.config_saved"));
    } catch (err: unknown) {
      toast.error(
        (err as Error).message ||
          t("teacher_interview_config.toasts.save_failed"),
      );
    }
  }

  async function handlePublish() {
    if (publishDisabled) return;
    try {
      await publishConfig.mutateAsync();
      toast.success(t("teacher_interview_config.toasts.published"));
    } catch (err: unknown) {
      const message = (err as Error).message || "";
      if (
        draftCount === 0 ||
        /question|insufficient|empty/i.test(message)
      ) {
        toast.error(t("teacher_interview_config.errors.questions_required"));
      } else {
        toast.error(
          message || t("teacher_interview_config.toasts.publish_failed"),
        );
      }
    }
  }

  async function handleArchive() {
    try {
      await updateConfig.mutateAsync({ status: "archived" });
      toast.success(t("teacher_interview_config.toasts.archived"));
    } catch (err: unknown) {
      toast.error(
        (err as Error).message ||
          t("teacher_interview_config.toasts.archive_failed"),
      );
    }
  }

  async function handleDelete() {
    try {
      await deleteConfig.mutateAsync();
      toast.success(t("teacher_interview_config.toasts.deleted"));
      returnToCourse();
    } catch (err: unknown) {
      toast.error(
        (err as Error).message ||
          t("teacher_interview_config.toasts.delete_failed"),
      );
    } finally {
      setConfirmDelete(false);
    }
  }

  return (
    <div className="space-y-6 pb-12 max-w-[1400px] mx-auto">
      <Breadcrumbs
        items={[
          { label: t("teacher_common.breadcrumb_teaching"), to: "/teacher/courses" },
          {
            label: course?.title ?? t("teacher_common.breadcrumb_course"),
            to: "/teacher/courses/$courseId",
            params: { courseId },
          },
          ...(courseModule ? [{ label: courseModule.title }] : []),
          { label: config.title },
        ]}
      />

      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex items-start gap-3 min-w-0 flex-1">
          <Link to="/teacher/courses/$courseId" params={{ courseId }}>
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 mt-1 shrink-0"
              title={t("teacher_interview_config.actions.back_tooltip")}
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
                {t("teacher_interview_config.header.draft_count", {
                  count: draftCount,
                })}
              </Badge>
              {isPublished ? (
                <Badge className="border-0 bg-emerald-100 text-emerald-700 text-[11px] font-bold gap-1.5 rounded-full px-2.5 py-1">
                  <CheckCircle2 className="h-3 w-3" />
                  {t("teacher_interview_config.status.published")}
                </Badge>
              ) : isArchived ? (
                <Badge className="border-0 bg-slate-100 text-slate-700 text-[11px] font-bold rounded-full px-2.5 py-1">
                  {t("teacher_interview_config.status.archived")}
                </Badge>
              ) : (
                <Badge className="border-0 bg-amber-50 text-amber-700 text-[11px] font-bold rounded-full px-2.5 py-1">
                  {t("teacher_interview_config.status.draft")}
                </Badge>
              )}
              <AIInsightChip>
                {t("teacher_interview_config.header.chip_label")}
              </AIInsightChip>
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
            {t("teacher_interview_config.actions.generate_with_ai")}
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
                ? t("teacher_interview_config.errors.questions_required")
                : isPublished
                  ? t("teacher_interview_config.status.published")
                  : t("teacher_interview_config.actions.publish_label")
            }
          >
            {publishConfig.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : isPublished ? (
              <CheckCircle2 className="h-4 w-4" />
            ) : (
              <Upload className="h-4 w-4" />
            )}
            {isPublished
              ? t("teacher_interview_config.status.published")
              : t("teacher_interview_config.actions.publish_short")}
          </Button>
          {!isArchived && (
            <Button
              type="button"
              variant="outline"
              className="gap-2"
              onClick={handleArchive}
              disabled={updateConfig.isPending}
            >
              {t("teacher_interview_config.actions.archive")}
            </Button>
          )}
          <Button
            type="button"
            variant="outline"
            className="gap-2 border-red-200 text-red-700 hover:bg-red-50 hover:text-red-700"
            onClick={() => setConfirmDelete(true)}
            disabled={deleteConfig.isPending}
            title={t("teacher_interview_config.actions.delete_tooltip")}
          >
            <Trash2 className="h-4 w-4" />
            {t("common.delete")}
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
                  {t("teacher_interview_config.confirm_delete.title")}
                </h2>
                <p className="text-sm text-m3-on-surface-variant">
                  {t("teacher_interview_config.confirm_delete.body", {
                    title: config.title,
                  })}
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
                {t("common.cancel")}
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
                {t("common.delete")}
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
  const { t } = useTranslation();
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
        title={t("teacher_interview_config.sections.general.title")}
        description={t(
          "teacher_interview_config.sections.general.description",
        )}
      >
        <Field label={t("teacher_interview_config.fields.title")}>
          <Input
            value={draft.title}
            onChange={(e) => update("title", e.target.value)}
            placeholder={t(
              "teacher_interview_config.fields.title_placeholder",
            )}
            className="bg-m3-surface text-sm"
          />
        </Field>
      </Section>

      <Section title={t("teacher_interview_config.sections.style.title")}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label={t("teacher_interview_config.fields.persona")}>
            <select
              value={draft.persona}
              onChange={(e) => update("persona", e.target.value as Persona)}
              className="w-full rounded-xl border border-m3-outline-variant/20 bg-m3-surface px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-m3-secondary/30"
            >
              {PERSONA_KEYS.map((p) => (
                <option key={p} value={p}>
                  {t(`teacher_interview_config.persona.${p}`)}
                </option>
              ))}
            </select>
          </Field>
          <Field label={t("teacher_interview_config.fields.mode")}>
            <select
              value={draft.supported_modes}
              onChange={(e) =>
                update("supported_modes", e.target.value as SupportedMode)
              }
              className="w-full rounded-xl border border-m3-outline-variant/20 bg-m3-surface px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-m3-secondary/30"
            >
              {MODE_KEYS.map((m) => (
                <option key={m} value={m}>
                  {t(`teacher_interview_config.mode.${m}`)}
                </option>
              ))}
            </select>
          </Field>
        </div>
      </Section>

      <Section title={t("teacher_interview_config.sections.rules.title")}>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Field
            label={t("teacher_interview_config.fields.duration_label")}
            hint={t("teacher_interview_config.fields.duration_hint")}
          >
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
          <Field
            label={t("teacher_interview_config.fields.attempts_label")}
            hint={t("teacher_interview_config.fields.duration_hint")}
          >
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
            label={t("teacher_interview_config.fields.criteria_label")}
            hint={t("teacher_interview_config.fields.criteria_hint")}
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
          label={t("teacher_interview_config.fields.lock_ef_label")}
          description={t("teacher_interview_config.fields.lock_ef_desc")}
          value={draft.lock_quiz_ef_until_pass}
          onChange={(v) => update("lock_quiz_ef_until_pass", v)}
        />
      </Section>

      <Section
        title={t("teacher_interview_config.sections.guidance.title")}
        description={t(
          "teacher_interview_config.sections.guidance.description",
        )}
      >
        <Field
          label={t("teacher_interview_config.fields.supplementary_label")}
        >
          <textarea
            value={draft.supplementary_instructions}
            onChange={(e) =>
              update("supplementary_instructions", e.target.value)
            }
            rows={4}
            placeholder={t(
              "teacher_interview_config.fields.supplementary_placeholder",
            )}
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
          {t("teacher_interview_config.actions.save_config")}
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
  const { t } = useTranslation();
  return (
    <div className="rounded-xl border border-m3-outline-variant/20 bg-m3-surface-container-lowest p-5 shadow-glass space-y-4">
      <div className="flex items-center gap-2">
        <div className="h-9 w-9 rounded-xl gradient-primary flex items-center justify-center shadow-ai-glow shrink-0">
          <Brain className="h-5 w-5 text-white" />
        </div>
        <div>
          <h3 className="font-headline font-bold text-sm text-m3-on-surface">
            {t("teacher_interview_config.questions.section_title")}
          </h3>
          <p className="text-[11px] text-m3-on-surface-variant">
            {t("teacher_interview_config.questions.section_description")}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 text-center">
        <div className="rounded-xl bg-m3-surface-container-low p-3">
          <p className="text-[10px] uppercase font-bold text-m3-on-surface-variant tracking-widest">
            {t("teacher_interview_config.questions.count_label")}
          </p>
          <p className="text-2xl font-extrabold font-headline text-m3-primary mt-1">
            {draftCount}
          </p>
        </div>
        <div className="rounded-xl bg-m3-surface-container-low p-3">
          <p className="text-[10px] uppercase font-bold text-m3-on-surface-variant tracking-widest">
            {t("teacher_interview_config.questions.weight_total")}
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
        {t("teacher_interview_config.questions.open_generator")}
      </Button>

      {draftCount === 0 && (
        <p className="text-[11px] text-amber-700 bg-amber-50 rounded-xl px-3 py-2 leading-relaxed">
          {t("teacher_interview_config.questions.empty")}
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
  const { t } = useTranslation();
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
      toast.success(t("teacher_interview_config.toasts.generation_started"));
    } catch (err: unknown) {
      toast.error(
        (err as Error).message ||
          t("teacher_interview_config.toasts.generation_failed"),
      );
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
                {t("teacher_interview_config.actions.generate_with_ai")}
              </h2>
              <p className="text-xs text-m3-on-surface-variant">
                {t("teacher_interview_config.generate_modal.description")}
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
            <Field label={t("teacher_interview_config.generate.mode_label")}>
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
                <option value="outcome-based">
                  {t("teacher_interview_config.generate.mode_outcome")}
                </option>
                <option value="topic">
                  {t("teacher_interview_config.generate.mode_topic")}
                </option>
                <option value="coverage">
                  {t("teacher_interview_config.generate.mode_coverage")}
                </option>
              </select>
            </Field>
            <Field label={t("teacher_interview_config.generate.count_label")}>
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

          <Field label={t("teacher_interview_config.fields.persona")}>
            <select
              value={form.persona}
              onChange={(e) =>
                setForm((f) => ({ ...f, persona: e.target.value as Persona }))
              }
              className="w-full rounded-xl border border-m3-outline-variant/20 bg-m3-surface-container-low px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-m3-secondary/30"
            >
              {PERSONA_KEYS.map((p) => (
                <option key={p} value={p}>
                  {t(`teacher_interview_config.persona.${p}`)}
                </option>
              ))}
            </select>
          </Field>

          <Field
            label={t("teacher_interview_config.generate.focus_label")}
            hint={t("teacher_interview_config.generate.focus_hint")}
          >
            <Input
              value={form.focus_topics}
              onChange={(e) =>
                setForm((f) => ({ ...f, focus_topics: e.target.value }))
              }
              placeholder={t(
                "teacher_interview_config.generate.focus_placeholder",
              )}
              className="bg-m3-surface-container-low text-sm"
            />
          </Field>

          <Field
            label={t("teacher_interview_config.generate.avoid_label")}
            hint={t("teacher_interview_config.generate.avoid_hint")}
          >
            <Input
              value={form.avoid_topics}
              onChange={(e) =>
                setForm((f) => ({ ...f, avoid_topics: e.target.value }))
              }
              placeholder={t(
                "teacher_interview_config.generate.avoid_placeholder",
              )}
              className="bg-m3-surface-container-low text-sm"
            />
          </Field>

          <Field
            label={t("teacher_interview_config.fields.supplementary_label")}
          >
            <textarea
              value={form.supplementary_instructions}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  supplementary_instructions: e.target.value,
                }))
              }
              rows={3}
              placeholder={t(
                "teacher_interview_config.generate.supplementary_placeholder",
              )}
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
                  ? t("teacher_interview_config.generate.in_progress")
                  : failed
                    ? t("teacher_interview_config.generate.failed")
                    : t("teacher_interview_config.generate.completed")}
              </div>
              {failed && run?.failure_message && (
                <p className="mt-1 text-xs">{run.failure_message}</p>
              )}
              {completed && (
                <p className="mt-1 text-xs">
                  {t("teacher_interview_config.generate.success_body")}
                </p>
              )}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2 border-t border-m3-outline-variant/20">
            <Button type="button" variant="outline" onClick={onClose}>
              {t("common.close")}
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
              {inProgress
                ? t("teacher_interview_config.generate.processing")
                : t("teacher_interview_config.generate.start_button")}
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
            value ? "left-6 bg-surface-elev" : "left-1 bg-slate-400",
          )}
        />
      </button>
    </div>
  );
}