import { useEffect, useState } from "react";
import { Link, useParams } from "@tanstack/react-router";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Brain,
  ChevronDown,
  RefreshCw,
  Sparkles,
  Users,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useQueries } from "@tanstack/react-query";
import {
  useCohortKr,
  useDifficultCards,
} from "@/lib/api/hooks/spaced-repetition";
import { useCourse, useCourseModules } from "@/lib/api/hooks/courses";
import { apiFetch } from "@/lib/api/client";
import { queryKeys } from "@/lib/api/query-keys";
import { SectionHeader } from "@/components/ui/section-header";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import type { LessonPublic, ModulePublic } from "@/lib/api/types";
import { cn } from "@/lib/utils";

type LessonOption = {
  lesson_id: string;
  lesson_title: string;
  module_title: string;
};

function useAllLessonsForCourse(courseId: string | undefined) {
  const { data: modules, isLoading: modulesLoading } =
    useCourseModules(courseId);

  const sortedModules: ModulePublic[] = (modules ?? [])
    .slice()
    .sort((a, b) => a.position - b.position);

  const lessonQueries = useQueries({
    queries: sortedModules.map((mod) => ({
      queryKey: queryKeys.courses.moduleLessons(mod.id),
      queryFn: () => apiFetch<LessonPublic[]>(`/modules/${mod.id}/lessons`),
    })),
  });

  const lessons: LessonOption[] = [];
  sortedModules.forEach((mod, idx) => {
    const result = lessonQueries[idx];
    if (!result?.data) return;
    for (const l of result.data) {
      lessons.push({
        lesson_id: l.id,
        lesson_title: l.title,
        module_title: mod.title,
      });
    }
  });

  const isLoading =
    modulesLoading || lessonQueries.some((q) => q.isLoading);

  return { lessons, isLoading };
}

function CohortHistogram({
  data,
}: {
  data: { bucket_lower: number; count: number }[];
}) {
  const chartData = data.map((b) => ({
    bucket: `${Math.round(b.bucket_lower * 100)}%`,
    count: b.count,
  }));

  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart
        data={chartData}
        margin={{ top: 12, right: 12, bottom: 8, left: 0 }}
      >
        <CartesianGrid
          strokeDasharray="3 3"
          stroke="var(--border)"
          opacity={0.5}
        />
        <XAxis
          dataKey="bucket"
          tick={{ fill: "var(--text-muted)", fontSize: 11 }}
          stroke="var(--border)"
          label={{
            value: "Khoảng KR",
            position: "insideBottom",
            offset: -2,
            fill: "var(--text-muted)",
            fontSize: 11,
          }}
        />
        <YAxis
          tick={{ fill: "var(--text-muted)", fontSize: 11 }}
          stroke="var(--border)"
          allowDecimals={false}
          label={{
            value: "Số sinh viên",
            angle: -90,
            position: "insideLeft",
            fill: "var(--text-muted)",
            fontSize: 11,
          }}
        />
        <Tooltip
          cursor={{ fill: "var(--surface-muted)", opacity: 0.4 }}
          contentStyle={{
            backgroundColor: "var(--surface-elev)",
            border: "1px solid var(--border)",
            borderRadius: 8,
            fontSize: 12,
            color: "var(--text-strong)",
          }}
          formatter={(value) => [String(value), "Số sinh viên"]}
          labelFormatter={(label) => `Khoảng KR: ${String(label ?? "")}`}
        />
        <Bar
          dataKey="count"
          fill="var(--primary)"
          radius={[6, 6, 0, 0]}
          isAnimationActive={false}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}

export default function TeacherSrCohortPage() {
  const { courseId } = useParams({ strict: false }) as { courseId: string };
  const { data: course } = useCourse(courseId);
  const { lessons, isLoading: lessonsLoading } =
    useAllLessonsForCourse(courseId);

  const [selectedLessonId, setSelectedLessonId] = useState<string | undefined>(
    undefined,
  );

  useEffect(() => {
    if (!selectedLessonId && lessons.length > 0) {
      setSelectedLessonId(lessons[0].lesson_id);
    }
  }, [lessons, selectedLessonId]);

  const { data: cohort, isLoading: cohortLoading } = useCohortKr(
    courseId,
    selectedLessonId,
  );
  const { data: difficult, isLoading: difficultLoading } = useDifficultCards(
    courseId,
    selectedLessonId,
    10,
  );

  const selectedLesson = lessons.find(
    (l) => l.lesson_id === selectedLessonId,
  );
  const histogramTotal =
    cohort?.histogram?.reduce((acc, b) => acc + b.count, 0) ?? 0;

  return (
    <div className="min-h-screen bg-m3-surface pb-12">
      <div className="max-w-6xl mx-auto space-y-6">
        <Breadcrumbs
          items={[
            { label: "Giảng dạy", to: "/teacher/courses" },
            { label: course?.title ?? "Khóa học", to: "/teacher/courses/$courseId" },
            { label: "Tổng quan lớp" },
          ]}
        />

        <div className="flex items-center gap-3">
          <Link
            to="/teacher/courses/$courseId"
            params={{ courseId }}
            className="p-2 rounded-xl hover:bg-m3-surface-container-high text-m3-on-surface-variant transition-colors cursor-pointer"
            aria-label="Quay lại"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <SectionHeader
            title="Tổng quan lớp"
            subtitle="Phân bố KR và các câu hỏi khó của từng bài"
          />
        </div>

        <div className="bg-m3-surface-container-lowest rounded-xl ghost-border shadow-editorial p-5 space-y-3">
          <label
            htmlFor="lesson-select"
            className="text-xs font-bold uppercase tracking-widest text-m3-on-surface-variant"
          >
            Chọn bài học
          </label>
          <div className="relative">
            <select
              id="lesson-select"
              value={selectedLessonId ?? ""}
              onChange={(e) => setSelectedLessonId(e.target.value || undefined)}
              disabled={lessonsLoading || lessons.length === 0}
              className="w-full appearance-none px-4 py-2.5 pr-10 rounded-xl bg-m3-surface-container-low border border-m3-outline-variant/20 text-sm text-m3-on-surface focus:outline-none focus:ring-2 focus:ring-m3-primary/20 disabled:opacity-50 cursor-pointer"
            >
              {lessonsLoading && <option>Đang tải...</option>}
              {!lessonsLoading && lessons.length === 0 && (
                <option>Khóa học chưa có bài học</option>
              )}
              {lessons.map((l) => (
                <option key={l.lesson_id} value={l.lesson_id}>
                  {l.module_title} — {l.lesson_title}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-m3-on-surface-variant pointer-events-none" />
          </div>
        </div>

        <section className="bg-m3-surface-container-lowest rounded-xl ghost-border shadow-editorial p-6 space-y-5">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1">
              <h2 className="font-heading font-bold text-lg text-m3-on-surface">
                Phân bố KR — {selectedLesson?.lesson_title ?? "—"}
              </h2>
              <p className="text-xs text-m3-on-surface-variant">
                Số lượng sinh viên theo từng khoảng KR
              </p>
            </div>
            <div className="inline-flex items-center gap-2 text-xs font-bold text-m3-primary bg-m3-primary-fixed px-3 py-1.5 rounded-xl shrink-0">
              <Users className="h-3.5 w-3.5" />
              <span>{cohort?.student_count ?? 0} sinh viên</span>
            </div>
          </div>

          {cohortLoading ? (
            <div className="h-[260px] rounded-xl bg-m3-surface-container-low animate-pulse" />
          ) : !cohort || histogramTotal === 0 ? (
            <div className="rounded-xl border-2 border-dashed border-m3-outline-variant flex flex-col items-center justify-center gap-3 py-12 text-center">
              <div className="w-12 h-12 rounded-xl bg-m3-primary-fixed flex items-center justify-center">
                <Brain className="h-6 w-6 text-m3-primary" />
              </div>
              <p className="text-sm font-semibold text-m3-on-surface">
                Chưa có dữ liệu KR
              </p>
              <p className="text-xs text-m3-on-surface-variant max-w-md">
                Sinh viên cần hoàn thành ít nhất một lượt ôn tập để xuất hiện
                trong biểu đồ.
              </p>
            </div>
          ) : (
            <CohortHistogram data={cohort.histogram ?? []} />
          )}

          {cohort && histogramTotal > 0 && (
            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-m3-outline-variant/10">
              <div className="bg-m3-surface-container-low rounded-xl p-4 text-center">
                <p className="text-xs uppercase tracking-widest text-m3-on-surface-variant font-bold">
                  KR trung bình
                </p>
                <p className="text-2xl font-heading font-black text-m3-primary mt-1">
                  {(cohort.mean_kr * 100).toFixed(1)}%
                </p>
              </div>
              <div className="bg-m3-surface-container-low rounded-xl p-4 text-center">
                <p className="text-xs uppercase tracking-widest text-m3-on-surface-variant font-bold">
                  KR trung vị
                </p>
                <p className="text-2xl font-heading font-black text-m3-primary mt-1">
                  {(cohort.median_kr * 100).toFixed(1)}%
                </p>
              </div>
            </div>
          )}
        </section>

        <section className="bg-m3-surface-container-lowest rounded-xl ghost-border shadow-editorial overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-m3-outline-variant/20">
            <div className="space-y-0.5">
              <h2 className="font-heading font-bold text-lg text-m3-on-surface flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-m3-secondary" />
                Câu khó
              </h2>
              <p className="text-xs text-m3-on-surface-variant">
                Top 10 câu hỏi có EF trung bình thấp nhất
              </p>
            </div>
          </div>

          {difficultLoading ? (
            <div className="p-6 space-y-2">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="h-14 rounded-xl bg-m3-surface-container-low animate-pulse"
                />
              ))}
            </div>
          ) : !difficult || difficult.length === 0 ? (
            <div className="px-6 py-12 flex flex-col items-center gap-3 text-center">
              <AlertTriangle className="h-8 w-8 text-m3-on-surface-variant opacity-40" />
              <p className="text-sm font-semibold text-m3-on-surface">
                Chưa có câu hỏi khó
              </p>
              <p className="text-xs text-m3-on-surface-variant">
                Cần thêm dữ liệu để xếp hạng.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-m3-outline-variant/10">
              <div className="hidden sm:grid grid-cols-[1fr_120px_120px_140px] gap-4 px-6 py-2.5 bg-m3-surface-container-low">
                <span className="text-[10px] font-bold uppercase tracking-widest text-m3-on-surface-variant">
                  Câu hỏi
                </span>
                <span className="text-[10px] font-bold uppercase tracking-widest text-m3-on-surface-variant">
                  EF trung bình
                </span>
                <span className="text-[10px] font-bold uppercase tracking-widest text-m3-on-surface-variant">
                  Sinh viên
                </span>
                <span className="text-[10px] font-bold uppercase tracking-widest text-m3-on-surface-variant text-right">
                  Hành động
                </span>
              </div>
              {difficult.map((card) => {
                const efClass =
                  card.mean_ef < 1.6
                    ? "bg-red-100 text-red-700 border-red-200"
                    : card.mean_ef < 2.0
                      ? "bg-amber-100 text-amber-700 border-amber-200"
                      : "bg-emerald-100 text-emerald-700 border-emerald-200";
                return (
                  <div
                    key={card.question_id}
                    className="grid sm:grid-cols-[1fr_120px_120px_140px] gap-4 px-6 py-3 items-center hover:bg-m3-surface-container-low transition-colors"
                  >
                    <p className="text-sm text-m3-on-surface font-mono truncate">
                      {card.question_id.slice(0, 8)}…
                    </p>
                    <span
                      className={cn(
                        "text-xs font-bold px-2.5 py-1 rounded-full border w-fit",
                        efClass,
                      )}
                    >
                      EF {card.mean_ef.toFixed(2)}
                    </span>
                    <span className="text-sm text-m3-on-surface-variant inline-flex items-center gap-1">
                      <Users className="h-3.5 w-3.5" />
                      {card.student_count}
                    </span>
                    <Link
                      to="/teacher/courses/$courseId/quizzes/$quizId"
                      params={{ courseId, quizId: card.quiz_id }}
                      search={{ question: card.question_id }}
                      className="inline-flex items-center justify-end gap-1.5 text-xs font-semibold text-m3-primary hover:underline cursor-pointer"
                    >
                      <RefreshCw className="h-3 w-3" />
                      Tái tạo câu hỏi
                    </Link>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
