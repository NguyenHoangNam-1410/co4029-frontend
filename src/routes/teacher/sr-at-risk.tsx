import { Link, useParams } from "@tanstack/react-router";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ChevronRight,
  Clock,
  Snowflake,
  TrendingDown,
  UserCog,
  XCircle,
} from "lucide-react";
import { useAtRiskStudents } from "@/lib/api/hooks/spaced-repetition";
import { useCourse } from "@/lib/api/hooks/courses";
import { SectionHeader } from "@/components/ui/section-header";
import type { AtRiskStudent } from "@/lib/api/types";
import { cn } from "@/lib/utils";

const FLAG_META = {
  low_compliance: {
    label: "Tỷ lệ tuân thủ thấp",
    short: "Tuân thủ",
    icon: TrendingDown,
  },
  frozen_kr: {
    label: "KR đứng yên",
    short: "KR",
    icon: Snowflake,
  },
  high_theory_practice_gap: {
    label: "Chênh lệch lý thuyết-thực hành cao",
    short: "Lý thuyết / Thực hành",
    icon: AlertTriangle,
  },
} as const;

function relDate(iso: string | null | undefined) {
  if (!iso) return "Chưa có hoạt động";
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(iso);
  d.setHours(0, 0, 0, 0);
  const days = Math.round((today.getTime() - d.getTime()) / 86_400_000);
  if (days <= 0) return "Hôm nay";
  if (days === 1) return "Hôm qua";
  if (days < 7) return `${days} ngày trước`;
  if (days < 30) return `${Math.floor(days / 7)} tuần trước`;
  return `${Math.floor(days / 30)} tháng trước`;
}

function FlagCell({ active, label }: { active: boolean; label: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center gap-1 text-[11px] font-bold w-7 h-7 rounded-lg shrink-0",
        active
          ? "bg-red-100 text-red-700"
          : "bg-emerald-50 text-emerald-600",
      )}
      title={label}
      aria-label={label}
    >
      {active ? (
        <XCircle className="h-3.5 w-3.5" />
      ) : (
        <CheckCircle2 className="h-3.5 w-3.5" />
      )}
    </span>
  );
}

function StudentRow({
  courseId,
  student,
}: {
  courseId: string;
  student: AtRiskStudent;
}) {
  const flagCount =
    Number(student.low_compliance) +
    Number(student.frozen_kr) +
    Number(student.high_theory_practice_gap);

  return (
    <Link
      to="/teacher/courses/$courseId/students/$studentId/sr"
      params={{ courseId, studentId: student.student_id }}
      className="grid grid-cols-[1fr_auto_auto_auto_auto_auto] gap-3 items-center px-5 py-4 hover:bg-m3-surface-container-low transition-colors group cursor-pointer"
    >
      <div className="min-w-0">
        <p className="text-sm font-semibold text-m3-on-surface truncate">
          {student.name}
        </p>
        <p className="text-xs text-m3-on-surface-variant inline-flex items-center gap-1.5 mt-0.5">
          <Clock className="h-3 w-3" />
          {relDate(student.last_active_at)}
        </p>
      </div>

      <FlagCell
        active={student.low_compliance}
        label={FLAG_META.low_compliance.label}
      />
      <FlagCell
        active={student.frozen_kr}
        label={FLAG_META.frozen_kr.label}
      />
      <FlagCell
        active={student.high_theory_practice_gap}
        label={FLAG_META.high_theory_practice_gap.label}
      />

      <span
        className={cn(
          "text-[10px] font-bold px-2 py-1 rounded-full shrink-0 hidden sm:inline-block",
          flagCount >= 2
            ? "bg-red-100 text-red-700"
            : "bg-amber-100 text-amber-700",
        )}
      >
        {flagCount} cờ
      </span>

      <ChevronRight className="h-4 w-4 text-m3-on-surface-variant opacity-0 group-hover:opacity-100 transition-opacity" />
    </Link>
  );
}

export default function TeacherSrAtRiskPage() {
  const { courseId } = useParams({ strict: false }) as { courseId: string };
  const { data: course } = useCourse(courseId);
  const { data: students, isLoading } = useAtRiskStudents(courseId);

  const atRiskList = students ?? [];

  return (
    <div className="min-h-screen bg-m3-surface pb-12">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        <div className="flex items-center gap-1.5 text-xs text-m3-on-surface-variant">
          <Link
            to="/teacher/courses"
            className="hover:text-m3-primary transition-colors"
          >
            Khóa học
          </Link>
          <ArrowRight className="h-3 w-3" />
          <Link
            to="/teacher/courses/$courseId"
            params={{ courseId }}
            className="hover:text-m3-primary transition-colors truncate max-w-[200px]"
          >
            {course?.title ?? "..."}
          </Link>
          <ArrowRight className="h-3 w-3" />
          <span className="text-m3-on-surface font-medium">
            Sinh viên cần hỗ trợ
          </span>
        </div>

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
            title="Sinh viên cần hỗ trợ"
            subtitle="Danh sách sinh viên cần can thiệp dựa trên 3 tín hiệu UC-COURSE-04"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {(
            ["low_compliance", "frozen_kr", "high_theory_practice_gap"] as const
          ).map((key) => {
            const meta = FLAG_META[key];
            const count = atRiskList.filter((s) => s[key]).length;
            const Icon = meta.icon;
            return (
              <div
                key={key}
                className="bg-m3-surface-container-lowest rounded-xl ghost-border shadow-editorial p-4 flex items-start gap-3"
              >
                <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center shrink-0">
                  <Icon className="h-5 w-5 text-red-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold uppercase tracking-widest text-m3-on-surface-variant truncate">
                    {meta.short}
                  </p>
                  <p className="text-2xl font-heading font-black text-m3-primary mt-0.5">
                    {isLoading ? "—" : count}
                  </p>
                  <p className="text-xs text-m3-on-surface-variant mt-0.5">
                    {meta.label}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        <section className="bg-m3-surface-container-lowest rounded-xl ghost-border shadow-editorial overflow-hidden">
          <div className="hidden sm:grid grid-cols-[1fr_auto_auto_auto_auto_auto] gap-3 px-5 py-3 border-b border-m3-outline-variant/10 bg-m3-surface-container-low">
            <span className="text-[10px] font-bold uppercase tracking-widest text-m3-on-surface-variant">
              Sinh viên
            </span>
            <span
              className="text-[10px] font-bold uppercase tracking-widest text-m3-on-surface-variant w-7 text-center"
              title={FLAG_META.low_compliance.label}
            >
              TT
            </span>
            <span
              className="text-[10px] font-bold uppercase tracking-widest text-m3-on-surface-variant w-7 text-center"
              title={FLAG_META.frozen_kr.label}
            >
              KR
            </span>
            <span
              className="text-[10px] font-bold uppercase tracking-widest text-m3-on-surface-variant w-7 text-center"
              title={FLAG_META.high_theory_practice_gap.label}
            >
              LT/TH
            </span>
            <span className="text-[10px] font-bold uppercase tracking-widest text-m3-on-surface-variant">
              Tổng
            </span>
            <span />
          </div>

          {isLoading ? (
            <div className="p-5 space-y-3">
              {[0, 1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-14 rounded-xl bg-m3-surface-container-low animate-pulse"
                />
              ))}
            </div>
          ) : atRiskList.length === 0 ? (
            <div className="px-6 py-12 flex flex-col items-center gap-3 text-center">
              <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center">
                <UserCog className="h-6 w-6 text-emerald-600" />
              </div>
              <p className="text-sm font-semibold text-m3-on-surface">
                Không có sinh viên cần hỗ trợ
              </p>
              <p className="text-xs text-m3-on-surface-variant max-w-md">
                Tất cả sinh viên đang theo kịp tiến độ. Tiếp tục theo dõi
                trên Tổng quan lớp.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-m3-outline-variant/10">
              {atRiskList.map((student) => (
                <StudentRow
                  key={student.student_id}
                  courseId={courseId}
                  student={student}
                />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
