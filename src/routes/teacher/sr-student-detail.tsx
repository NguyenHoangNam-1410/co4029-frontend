import { Link, useParams } from "@tanstack/react-router";
import {
  ArrowLeft,
  ArrowRight,
  Brain,
  CheckCircle2,
  Clock,
  Lock,
  XCircle,
} from "lucide-react";
import { useStudentSrDetail } from "@/lib/api/hooks/spaced-repetition";
import { useCourse } from "@/lib/api/hooks/courses";
import { SectionHeader } from "@/components/ui/section-header";
import type { StudentSrDetailLesson } from "@/lib/api/types";
import { cn } from "@/lib/utils";

const STATUS_META: Record<
  StudentSrDetailLesson["status"],
  { label: string; badge: string }
> = {
  mature: {
    label: "Đã thuần thục",
    badge: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  learning: {
    label: "Đang học",
    badge: "bg-amber-50 text-amber-700 border-amber-200",
  },
  locked: {
    label: "Đã khóa",
    badge: "bg-slate-100 text-slate-600 border-slate-200",
  },
};

function formatRelative(iso: string): string {
  const now = Date.now();
  const t = new Date(iso).getTime();
  const diff = now - t;
  if (diff < 60_000) return "Vừa xong";
  const minutes = Math.round(diff / 60_000);
  if (minutes < 60) return `${minutes} phút trước`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} giờ trước`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days} ngày trước`;
  return new Date(iso).toLocaleDateString("vi-VN");
}

export default function TeacherSrStudentDetailPage() {
  const { courseId, studentId } = useParams({ strict: false }) as {
    courseId: string;
    studentId: string;
  };
  const { data: course } = useCourse(courseId);
  const { data, isLoading } = useStudentSrDetail(courseId, studentId, {
    recentReviewsLimit: 20,
  });

  const lessons = data?.lessons ?? [];
  const reviews = data?.recent_reviews ?? [];

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
          <Link
            to="/teacher/courses/$courseId/at-risk"
            params={{ courseId }}
            className="hover:text-m3-primary transition-colors"
          >
            Sinh viên cần hỗ trợ
          </Link>
          <ArrowRight className="h-3 w-3" />
          <span className="text-m3-on-surface font-medium">Chi tiết</span>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to="/teacher/courses/$courseId/at-risk"
            params={{ courseId }}
            className="p-2 rounded-xl hover:bg-m3-surface-container-high text-m3-on-surface-variant transition-colors cursor-pointer"
            aria-label="Quay lại"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <SectionHeader
            title={data?.name ?? "Đang tải..."}
            subtitle="Tiến độ ôn tập theo bài và lịch sử gần đây"
          />
        </div>

        <section className="bg-m3-surface-container-lowest rounded-xl ghost-border shadow-editorial overflow-hidden">
          <div className="px-6 py-4 border-b border-m3-outline-variant/20">
            <h2 className="font-heading font-bold text-base text-m3-on-surface flex items-center gap-2">
              <Brain className="h-4 w-4 text-m3-secondary" />
              Tiến độ theo bài học
            </h2>
            <p className="text-xs text-m3-on-surface-variant mt-0.5">
              KR ước tính, số thẻ và trạng thái cho từng bài
            </p>
          </div>

          {isLoading ? (
            <div className="p-6 space-y-2">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="h-14 rounded-xl bg-m3-surface-container-low animate-pulse"
                />
              ))}
            </div>
          ) : lessons.length === 0 ? (
            <div className="px-6 py-12 flex flex-col items-center gap-3 text-center">
              <Lock className="h-8 w-8 text-m3-on-surface-variant opacity-40" />
              <p className="text-sm font-semibold text-m3-on-surface">
                Sinh viên chưa bắt đầu ôn tập bài nào
              </p>
            </div>
          ) : (
            <div className="divide-y divide-m3-outline-variant/10">
              <div className="hidden sm:grid grid-cols-[1fr_120px_120px_120px_120px] gap-3 px-6 py-2.5 bg-m3-surface-container-low">
                <span className="text-[10px] font-bold uppercase tracking-widest text-m3-on-surface-variant">
                  Bài học
                </span>
                <span className="text-[10px] font-bold uppercase tracking-widest text-m3-on-surface-variant">
                  KR
                </span>
                <span className="text-[10px] font-bold uppercase tracking-widest text-m3-on-surface-variant">
                  Tổng thẻ
                </span>
                <span className="text-[10px] font-bold uppercase tracking-widest text-m3-on-surface-variant">
                  Cần ôn
                </span>
                <span className="text-[10px] font-bold uppercase tracking-widest text-m3-on-surface-variant">
                  Trạng thái
                </span>
              </div>
              {lessons.map((lesson) => {
                const meta = STATUS_META[lesson.status];
                return (
                  <div
                    key={lesson.lesson_id}
                    className="grid sm:grid-cols-[1fr_120px_120px_120px_120px] gap-3 px-6 py-3 items-center hover:bg-m3-surface-container-low transition-colors"
                  >
                    <p className="text-sm font-medium text-m3-on-surface truncate">
                      {lesson.lesson_title}
                    </p>
                    <p className="text-sm font-bold text-m3-primary">
                      {(lesson.kr_estimate * 100).toFixed(1)}%
                    </p>
                    <p className="text-sm text-m3-on-surface-variant">
                      {lesson.cards_total}
                    </p>
                    <p
                      className={cn(
                        "text-sm font-semibold",
                        lesson.cards_due_now > 0
                          ? "text-amber-600"
                          : "text-m3-on-surface-variant",
                      )}
                    >
                      {lesson.cards_due_now}
                    </p>
                    <span
                      className={cn(
                        "text-[10px] font-bold px-2.5 py-1 rounded-full border w-fit",
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
        </section>

        <section className="bg-m3-surface-container-lowest rounded-xl ghost-border shadow-editorial overflow-hidden">
          <div className="px-6 py-4 border-b border-m3-outline-variant/20">
            <h2 className="font-heading font-bold text-base text-m3-on-surface flex items-center gap-2">
              <Clock className="h-4 w-4 text-m3-secondary" />
              Lịch sử ôn tập gần đây
            </h2>
            <p className="text-xs text-m3-on-surface-variant mt-0.5">
              {reviews.length > 0
                ? `${reviews.length} lượt ôn tập gần nhất`
                : "Chưa có lịch sử"}
            </p>
          </div>

          {isLoading ? (
            <div className="p-6 space-y-2">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="h-12 rounded-xl bg-m3-surface-container-low animate-pulse"
                />
              ))}
            </div>
          ) : reviews.length === 0 ? (
            <div className="px-6 py-10 flex flex-col items-center gap-2 text-center">
              <Clock className="h-7 w-7 text-m3-on-surface-variant opacity-40" />
              <p className="text-sm text-m3-on-surface-variant">
                Sinh viên chưa có hoạt động ôn tập nào.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-m3-outline-variant/10">
              {reviews.map((review, idx) => (
                <div
                  key={`${review.question_id}-${review.created_at}-${idx}`}
                  className="flex items-center gap-4 px-6 py-3 hover:bg-m3-surface-container-low transition-colors"
                >
                  <div
                    className={cn(
                      "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
                      review.correct ? "bg-emerald-100" : "bg-red-100",
                    )}
                  >
                    {review.correct ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-600" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-mono text-m3-on-surface truncate">
                      {review.question_id.slice(0, 8)}…
                    </p>
                    <p className="text-xs text-m3-on-surface-variant mt-0.5">
                      {formatRelative(review.created_at)}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs text-m3-on-surface-variant">
                      Q gần nhất
                    </p>
                    <p className="text-sm font-bold text-m3-primary">
                      {review.q_derived}
                    </p>
                  </div>
                  <div className="text-right shrink-0 hidden sm:block">
                    <p className="text-xs text-m3-on-surface-variant">
                      EF sau
                    </p>
                    <p className="text-sm font-bold text-m3-on-surface">
                      {review.ef_after.toFixed(2)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
