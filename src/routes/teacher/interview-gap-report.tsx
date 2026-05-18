import { Link, useParams } from "@tanstack/react-router";
import { ArrowLeft, FileText, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/glass-card";
import {
  useTeacherGapReport,
  useTeacherInterviewSession,
} from "@/lib/api/hooks/interviews";
import type {
  GapReportAuthoringRead,
  InterviewSessionPublic,
  StudyPlanItem,
} from "@/lib/api/types";

interface CriterionEntry {
  outcome_text?: unknown;
  verdict_met?: unknown;
  evidence_excerpt?: unknown;
  rationale?: unknown;
}

function asCriterionEntry(value: unknown): CriterionEntry | null {
  return value && typeof value === "object" ? (value as CriterionEntry) : null;
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value : null;
}

function formatDate(value: string): string {
  try {
    return new Date(value).toLocaleString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return value;
  }
}

export default function InterviewGapReportPage() {
  const { sessionId } = useParams({ strict: false }) as { sessionId: string };
  const { data: report, isLoading, isError, error } =
    useTeacherGapReport(sessionId);
  const { data: session } = useTeacherInterviewSession(sessionId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-m3-secondary" />
      </div>
    );
  }

  if (isError || !report) {
    return (
      <div className="text-center py-24 text-m3-on-surface-variant space-y-4">
        <div className="flex justify-center">
          <div className="h-12 w-12 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
            <FileText className="h-6 w-6" />
          </div>
        </div>
        <div>
          <p className="font-headline font-bold text-m3-on-surface">
            Chưa có báo cáo lỗ hổng
          </p>
          <p className="text-sm mt-1 max-w-md mx-auto">
            {(error as Error | undefined)?.message ||
              "Phiên phỏng vấn này chưa được chấm hoặc bạn không có quyền xem báo cáo."}
          </p>
        </div>
        <Link to="/teacher/courses" className="inline-flex">
          <Button variant="outline" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Quay lại
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12 max-w-[1100px] mx-auto">
      <Header report={report} session={session ?? null} />

      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12 lg:col-span-7 space-y-4">
          <SummaryCard
            summary={report.discrepancy_summary}
            teacherSummary={report.teacher_summary}
          />

          <CriterionBreakdown
            breakdown={report.per_criterion_breakdown}
          />
        </div>

        <div className="col-span-12 lg:col-span-5 space-y-4">
          <StudyPlanCard items={report.study_plan} />
          <SourceLinksCard report={report} />
        </div>
      </div>
    </div>
  );
}

function Header({
  report,
  session,
}: {
  report: GapReportAuthoringRead;
  session: InterviewSessionPublic | null;
}) {
  const configId = session?.interview_config_id;
  return (
    <div className="flex items-start gap-3">
      <Link to="/teacher/courses">
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 mt-1 shrink-0"
          title="Quay lại"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
      </Link>

      <div className="space-y-1.5">
        <p className="text-xs font-bold uppercase tracking-widest text-m3-on-surface-variant">
          Báo cáo lỗ hổng phỏng vấn
        </p>
        <h1 className="text-2xl lg:text-3xl font-extrabold font-headline tracking-tight text-gradient-primary leading-tight">
          Phiên #{report.id.slice(0, 8)}
        </h1>
        <p className="text-xs text-m3-on-surface-variant">
          Cập nhật lần cuối: {formatDate(report.generated_at)}
          {configId && ` · Phỏng vấn ${configId.slice(0, 8)}`}
        </p>
      </div>
    </div>
  );
}

function SummaryCard({
  summary,
  teacherSummary,
}: {
  summary: string | null | undefined;
  teacherSummary: string | null | undefined;
}) {
  return (
    <GlassCard className="p-6 space-y-4">
      <div>
        <h2 className="font-headline font-bold text-base text-m3-on-surface mb-2">
          Tổng quan khoảng cách
        </h2>
        {summary ? (
          <p className="text-sm text-m3-on-surface-variant leading-relaxed">
            {summary}
          </p>
        ) : (
          <p className="text-sm italic text-m3-on-surface-variant">
            AI chưa sinh phần tổng quan.
          </p>
        )}
      </div>
      {teacherSummary && (
        <div className="rounded-xl bg-m3-surface-container-low p-4 border border-m3-outline-variant/20">
          <p className="text-[11px] uppercase font-bold tracking-widest text-m3-on-surface-variant mb-1.5">
            Ghi chú của giảng viên
          </p>
          <p className="text-sm text-m3-on-surface leading-relaxed whitespace-pre-wrap">
            {teacherSummary}
          </p>
        </div>
      )}
    </GlassCard>
  );
}

function CriterionBreakdown({
  breakdown,
}: {
  breakdown: GapReportAuthoringRead["per_criterion_breakdown"];
}) {
  const entries = Object.entries(breakdown ?? {});
  return (
    <GlassCard className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-headline font-bold text-base text-m3-on-surface">
          Phân tích theo tiêu chí
        </h2>
        <span className="text-xs text-m3-on-surface-variant">
          {entries.length} tiêu chí
        </span>
      </div>

      {entries.length === 0 ? (
        <p className="text-sm italic text-m3-on-surface-variant">
          Không có dữ liệu chi tiết theo tiêu chí.
        </p>
      ) : (
        <ul className="space-y-3">
          {entries.map(([key, value]) => {
            const entry = asCriterionEntry(value);
            const verdict =
              entry && typeof entry.verdict_met === "boolean"
                ? entry.verdict_met
                : null;
            const text = asString(entry?.outcome_text) ?? key;
            const evidence = asString(entry?.evidence_excerpt);
            const rationale = asString(entry?.rationale);

            return (
              <li
                key={key}
                className="rounded-xl border border-m3-outline-variant/20 bg-m3-surface-container-lowest p-4 space-y-2"
              >
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm font-bold text-m3-on-surface leading-snug flex-1">
                    {text}
                  </p>
                  {verdict !== null && (
                    <span
                      className={
                        verdict
                          ? "shrink-0 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-bold uppercase tracking-widest px-2.5 py-1"
                          : "shrink-0 rounded-full bg-red-100 text-red-700 text-[10px] font-bold uppercase tracking-widest px-2.5 py-1"
                      }
                    >
                      {verdict ? "Đạt" : "Chưa đạt"}
                    </span>
                  )}
                </div>
                {evidence && (
                  <p className="text-xs text-m3-on-surface-variant leading-relaxed pl-1 border-l-2 border-m3-outline-variant/30">
                    <span className="font-bold not-italic mr-1">Trích dẫn:</span>
                    <span className="italic">{evidence}</span>
                  </p>
                )}
                {rationale && (
                  <p className="text-xs text-m3-on-surface-variant leading-relaxed">
                    <span className="font-bold mr-1">Phân tích:</span>
                    {rationale}
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </GlassCard>
  );
}

function StudyPlanCard({ items }: { items: StudyPlanItem[] }) {
  return (
    <GlassCard className="p-6 space-y-3">
      <h2 className="font-headline font-bold text-base text-m3-on-surface">
        Kế hoạch học tập
      </h2>
      {items.length === 0 ? (
        <p className="text-sm italic text-m3-on-surface-variant">
          AI chưa đề xuất bước học cụ thể.
        </p>
      ) : (
        <ol className="space-y-2.5">
          {items.map((item, idx) => (
            <li
              key={`${item.topic}-${idx}`}
              className="rounded-xl bg-m3-surface-container-low p-3"
            >
              <div className="flex items-start gap-2">
                <span className="shrink-0 h-6 w-6 rounded-full bg-m3-primary text-white flex items-center justify-center text-xs font-extrabold">
                  {idx + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-m3-on-surface">
                    {item.topic}
                  </p>
                  {item.suggested_resources.length > 0 && (
                    <p className="text-xs text-m3-on-surface-variant mt-1">
                      {item.suggested_resources.join(" • ")}
                    </p>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ol>
      )}
    </GlassCard>
  );
}

function SourceLinksCard({ report }: { report: GapReportAuthoringRead }) {
  const sources = [
    report.source_quiz_attempt_id && {
      label: "Lượt làm quiz nguồn",
      value: report.source_quiz_attempt_id,
    },
    report.source_interview_session_id && {
      label: "Phiên phỏng vấn nguồn",
      value: report.source_interview_session_id,
    },
  ].filter(Boolean) as Array<{ label: string; value: string }>;

  if (sources.length === 0) return null;

  return (
    <GlassCard className="p-6 space-y-3">
      <h2 className="font-headline font-bold text-base text-m3-on-surface">
        Liên kết nguồn
      </h2>
      <ul className="space-y-2">
        {sources.map((s) => (
          <li
            key={s.value}
            className="flex items-center justify-between gap-3 rounded-xl bg-m3-surface-container-low px-3 py-2 text-xs"
          >
            <span className="text-m3-on-surface-variant">{s.label}</span>
            <span className="font-mono font-bold text-m3-on-surface truncate">
              {s.value}
            </span>
          </li>
        ))}
      </ul>
    </GlassCard>
  );
}
