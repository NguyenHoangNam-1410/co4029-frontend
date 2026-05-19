import { useEffect, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { Archive, BookOpen, RotateCcw, Search } from "lucide-react";
import { InfiniteList } from "@/components/ui/InfiniteList";
import { useAdminCourses, useRestoreCourse } from "@/lib/api/hooks/admin";
import { useMyPermissions } from "@/lib/api/hooks/auth";
import type { CourseAuthoring } from "@/lib/api/types";

const STATUS_COLOR: Record<string, string> = {
  draft: "bg-amber-100 text-amber-700",
  published: "bg-emerald-100 text-emerald-700",
  archived: "bg-slate-200 text-slate-700",
};

function StatusBadge({ status }: { status: string }) {
  const { t } = useTranslation();
  const cls = STATUS_COLOR[status] ?? "bg-slate-100 text-slate-700";
  return (
    <span
      className={`inline-block px-2 py-0.5 text-[11px] font-semibold rounded-md ${cls}`}
    >
      {t(`admin.courses_list.row_status.${status}`, { defaultValue: status })}
    </span>
  );
}

function useFormatDate() {
  const { i18n } = useTranslation();
  const locale = (i18n.resolvedLanguage ?? i18n.language ?? "en") === "vi" ? "vi-VN" : "en-US";
  return (iso: string | null | undefined): string => {
    if (!iso) return "—";
    return new Intl.DateTimeFormat(locale, {
      dateStyle: "short",
      timeStyle: "short",
    }).format(new Date(iso));
  };
}

function CourseRow({ course }: { course: CourseAuthoring }) {
  const { t } = useTranslation();
  const formatDate = useFormatDate();
  const restore = useRestoreCourse();
  const isDeleted = course.deleted_at != null;
  const instructorName =
    course.instructor?.display_name?.trim() || course.instructor?.primary_email || "—";

  const handleRestore = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    restore.mutate(course.id, {
      onSuccess: () => toast.success(t("admin.course_detail.toasts.restored")),
      onError: (err) =>
        toast.error((err as Error).message || t("admin.course_detail.toasts.restore_failed")),
    });
  };

  return (
    <Link
      to="/admin/courses/$courseId"
      params={{ courseId: course.id }}
      className="block bg-surface-elev border border-border rounded-lg p-4 mb-2 hover:border-border-strong hover:shadow-editorial transition-colors duration-150"
    >
      <div className="flex items-start gap-4">
        <div className="w-9 h-9 rounded-full bg-m3-primary-fixed flex items-center justify-center shrink-0">
          <BookOpen className="h-4 w-4 text-m3-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-semibold text-text-strong truncate">
              {course.title}
            </p>
            <StatusBadge status={course.status} />
            {isDeleted ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-semibold rounded-md bg-red-100 text-red-700">
                <Archive className="h-3 w-3" />
                {t("admin.courses_list.row_status.deleted")} {formatDate(course.deleted_at)}
              </span>
            ) : null}
          </div>
          <p className="text-xs text-text-muted mt-1 truncate">{course.slug}</p>
          <p className="text-xs text-text-muted mt-0.5">
            {t("course_detail.instructor_role")}: <span className="text-text-strong">{instructorName}</span>
          </p>
        </div>
        {isDeleted ? (
          <button
            type="button"
            onClick={handleRestore}
            disabled={restore.isPending}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md bg-m3-primary text-white hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            {restore.isPending ? t("admin.course_detail.restoring") : t("admin.course_detail.restore")}
          </button>
        ) : null}
      </div>
    </Link>
  );
}

export default function AdminCoursesPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const permissions = useMyPermissions();
  const canAdmin =
    permissions.data?.permissions.includes("system.administer") ?? false;
  const [includeDeleted, setIncludeDeleted] = useState(true);

  useEffect(() => {
    if (permissions.isLoading) return;
    if (!canAdmin) {
      toast.error(t("admin.users.roles.errors.no_permission"));
      void navigate({ to: "/dashboard", replace: true });
    }
  }, [permissions.isLoading, canAdmin, navigate, t]);

  const enabled = !permissions.isLoading && canAdmin;
  const list = useAdminCourses({ includeDeleted });

  if (permissions.isLoading) {
    return (
      <div className="space-y-3 pb-12">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-20 bg-surface-muted animate-pulse rounded-lg"
          />
        ))}
      </div>
    );
  }

  if (!canAdmin) {
    return null;
  }

  return (
    <div className="space-y-6 pb-12">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-headline font-bold text-text-strong">
            {t("admin.courses_list.title")}
          </h1>
          <p className="text-sm text-text-muted mt-1">
            {t("admin.courses_list.subtitle")}
          </p>
        </div>
        <label className="inline-flex items-center gap-2 text-sm text-text-strong select-none">
          <input
            type="checkbox"
            checked={includeDeleted}
            onChange={(e) => setIncludeDeleted(e.target.checked)}
            className="h-4 w-4 rounded border-border accent-m3-primary"
          />
          {t("admin.courses_list.include_deleted")}
        </label>
      </div>

      {!enabled || list.isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="h-20 bg-surface-muted animate-pulse rounded-lg"
            />
          ))}
        </div>
      ) : list.isError ? (
        <div className="bg-surface-elev border border-border rounded-lg p-5">
          <p className="text-sm text-danger">
            {t("admin.courses_list.load_failed")}
          </p>
        </div>
      ) : (
        <InfiniteList<CourseAuthoring>
          items={list.items}
          hasNextPage={list.hasNextPage}
          fetchNextPage={list.fetchNextPage}
          isFetchingNextPage={list.isFetchingNextPage}
          renderItem={(course) => <CourseRow course={course} />}
          keyOf={(course) => course.id}
          empty={
            <div className="bg-surface-elev border border-border rounded-lg p-10 text-center">
              <Search className="h-10 w-10 mx-auto mb-3 text-text-subtle" />
              <p className="text-sm font-medium text-text-strong">
                {t("admin.courses_list.empty_title")}
              </p>
              <p className="text-xs text-text-muted mt-1">
                {t("admin.courses_list.empty_body")}
              </p>
            </div>
          }
        />
      )}
    </div>
  );
}
