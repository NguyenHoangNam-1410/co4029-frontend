import { useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  ArrowRight,
  BookOpen,
  Brain,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Inbox,
  Lock,
  Sparkles,
  Target,
} from "lucide-react";
import { useMyCourses } from "@/lib/api/hooks/courses";
import { useCourseSrOverview } from "@/lib/api/hooks/spaced-repetition";
import { Button } from "@/components/ui/button";
import { SectionHeader } from "@/components/ui/section-header";
import { StatCard } from "@/components/ui/stat-card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import type { Course, LessonOverviewItem } from "@/lib/api/types";
import { cn } from "@/lib/utils";

const STATUS_META: Record<
  LessonOverviewItem["status"],
  { label: string; badge: string; dot: string; icon: typeof CheckCircle2 }
> = {
  mature: {
    label: "Đã thuần thục",
    badge: "bg-emerald-50 text-emerald-700 border border-emerald-200",
    dot: "bg-emerald-500",
    icon: CheckCircle2,
  },
  learning: {
    label: "Đang học",
    badge: "bg-amber-50 text-amber-700 border border-amber-200",
    dot: "bg-amber-500",
    icon: Brain,
  },
  locked: {
    label: "Đã khóa",
    badge: "bg-slate-100 text-slate-600 border border-slate-200",
    dot: "bg-slate-400",
    icon: Lock,
  },
};

function CourseSrCard({ course }: { course: Course }) {
  const [expanded, setExpanded] = useState(false);
  const { data: overview, isLoading } = useCourseSrOverview(
    expanded ? course.id : undefined,
  );

  const totalDue = overview?.reduce((acc, l) => acc + l.due_count, 0) ?? 0;
  const matureCount =
    overview?.filter((l) => l.status === "mature").length ?? 0;

  return (
    <div className="bg-m3-surface-container-lowest rounded-xl ghost-border shadow-editorial overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center gap-4 p-5 text-left hover:bg-m3-surface-container-low transition-colors cursor-pointer"
        aria-expanded={expanded}
      >
        <div className="w-11 h-11 rounded-xl bg-m3-primary-fixed flex items-center justify-center shrink-0">
          <BookOpen className="h-5 w-5 text-m3-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-heading font-semibold text-m3-on-surface text-base leading-snug truncate">
            {course.title}
          </h3>
          {expanded && overview ? (
            <p className="text-xs text-m3-on-surface-variant mt-0.5">
              {overview.length} bài • {matureCount} đã thuần thục •{" "}
              {totalDue} thẻ cần ôn
            </p>
          ) : (
            <p className="text-xs text-m3-on-surface-variant mt-0.5">
              Bấm để xem tiến độ ôn tập theo bài
            </p>
          )}
        </div>
        {expanded ? (
          <ChevronUp className="h-4 w-4 text-m3-on-surface-variant shrink-0" />
        ) : (
          <ChevronDown className="h-4 w-4 text-m3-on-surface-variant shrink-0" />
        )}
      </button>

      {expanded && (
        <div className="border-t border-m3-outline-variant/20 px-5 py-4 space-y-2">
          {isLoading && (
            <div className="space-y-2">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-12 rounded-xl" />
              ))}
            </div>
          )}
          {!isLoading && overview && overview.length === 0 && (
            <p className="text-sm text-m3-on-surface-variant py-3 text-center">
              Khóa học chưa có bài học nào.
            </p>
          )}
          {!isLoading &&
            overview?.map((lesson) => {
              const meta = STATUS_META[lesson.status];
              const StatusIcon = meta.icon;
              return (
                <div
                  key={lesson.lesson_id}
                  className="flex items-center gap-3 p-3 rounded-xl hover:bg-m3-surface-container-low transition-colors"
                >
                  <div
                    className={cn(
                      "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
                      lesson.status === "mature"
                        ? "bg-emerald-100"
                        : lesson.status === "learning"
                          ? "bg-amber-100"
                          : "bg-slate-100",
                    )}
                  >
                    <StatusIcon
                      className={cn(
                        "h-4 w-4",
                        lesson.status === "mature"
                          ? "text-emerald-600"
                          : lesson.status === "learning"
                            ? "text-amber-600"
                            : "text-slate-500",
                      )}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-m3-on-surface truncate">
                      {lesson.lesson_title}
                    </p>
                    <p className="text-xs text-m3-on-surface-variant">
                      KR {Math.round(lesson.kr_estimate * 100)}% •{" "}
                      {lesson.due_count} thẻ cần ôn
                    </p>
                  </div>
                  <span
                    className={cn(
                      "text-[10px] font-bold px-2.5 py-1 rounded-full shrink-0",
                      meta.badge,
                    )}
                  >
                    {meta.label}
                  </span>
                </div>
              );
            })}
        </div>
      )}
    </div>
  );
}

export default function SrDashboardPage() {
  const { items: courses, isLoading: coursesLoading } = useMyCourses(20);

  return (
    <div className="min-h-screen bg-m3-surface pb-12">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-8">
        <header className="space-y-2">
          <div className="flex items-center gap-2 text-m3-primary text-xs font-bold uppercase tracking-widest">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Học lặp lại</span>
          </div>
          <h1 className="font-heading font-bold text-3xl sm:text-4xl text-m3-primary leading-tight">
            Bảng điều khiển ôn tập
          </h1>
          <p className="text-m3-on-surface-variant text-sm max-w-2xl">
            Theo dõi tiến độ ôn tập, xem các thẻ cần ôn hôm nay và mở khóa
            các bài học mới khi bạn đã sẵn sàng.
          </p>
        </header>

        <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard
            label="Khóa học đã ghi danh"
            value={coursesLoading ? "—" : courses.length}
            sublabel="Đang theo dõi"
            icon={BookOpen}
            variant="primary"
          />
          <StatCard
            label="Bài học sẵn sàng"
            value="—"
            sublabel="Mở khóa khi đạt KR ≥ 0.85"
            icon={Target}
            variant="surface"
          />
          <StatCard
            label="Thẻ cần ôn"
            value="—"
            sublabel="Tải tổng quan để xem"
            icon={Inbox}
            variant="surface"
          />
        </section>

        <section className="space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
            <SectionHeader
              title="Tiến độ theo khóa học"
              subtitle="Bấm để xem chi tiết các bài học trong từng khóa"
            />
            <Link
              to="/study/cards-due"
              className="inline-flex items-center gap-2 gradient-primary text-white rounded-xl font-semibold px-4 py-2 text-sm shadow-glass hover:opacity-90 transition-opacity self-start sm:self-auto cursor-pointer"
            >
              Ôn tập ngay
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          {coursesLoading ? (
            <div className="space-y-3">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-20 rounded-xl" />
              ))}
            </div>
          ) : courses.length === 0 ? (
            <EmptyState
              icon={Inbox}
              title="Bạn chưa được đăng ký khóa học nào"
              description="Liên hệ giảng viên để được đăng ký khóa học và bắt đầu lộ trình ôn tập."
              cta={
                <Link to="/courses">
                  <Button variant="default" className="gap-2 font-semibold cursor-pointer">
                    Khám phá khóa học
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              }
            />
          ) : (
            <div className="space-y-3">
              {courses.map((course) => (
                <CourseSrCard key={course.id} course={course} />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
