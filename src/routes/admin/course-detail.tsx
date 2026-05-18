import { useEffect } from "react";
import { Link, useNavigate, useParams } from "@tanstack/react-router";
import { toast } from "sonner";
import {
  ActivityIcon,
  ArrowLeft,
  CircleDollarSign,
  Cpu,
  HardDrive,
  RotateCcw,
} from "lucide-react";
import {
  useCourseAudit,
  useCourseProcessingJobs,
  useRestoreCourse,
} from "@/lib/api/hooks/admin";
import { useMyPermissions } from "@/lib/api/hooks/auth";
import { StatCard } from "@/components/ui/stat-card";
import type { ProcessingJobRow } from "@/lib/api/types";

const JOB_STATUS_COLOR: Record<string, string> = {
  pending: "bg-slate-100 text-slate-700",
  running: "bg-blue-100 text-blue-700",
  completed: "bg-emerald-100 text-emerald-700",
  failed: "bg-red-100 text-red-700",
  cancelled: "bg-slate-200 text-slate-700",
};

function JobStatusBadge({ status }: { status: string }) {
  const cls = JOB_STATUS_COLOR[status] ?? "bg-slate-100 text-slate-700";
  return (
    <span
      className={`inline-block px-2 py-0.5 text-[11px] font-semibold rounded-md ${cls}`}
    >
      {status}
    </span>
  );
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(iso));
}

function formatNumber(n: number | undefined | null): string {
  if (n === undefined || n === null) return "—";
  return new Intl.NumberFormat("vi-VN").format(n);
}

function formatUsd(n: number | undefined | null): string {
  if (n === undefined || n === null) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 4,
    maximumFractionDigits: 6,
  }).format(n);
}

function JobsTable({ jobs }: { jobs: ProcessingJobRow[] }) {
  if (jobs.length === 0) {
    return (
      <div className="bg-surface-elev border border-border rounded-lg p-8 text-center">
        <ActivityIcon className="h-8 w-8 mx-auto mb-2 text-text-subtle" />
        <p className="text-sm text-text-muted">
          Chưa có job xử lý nào cho khoá học này.
        </p>
      </div>
    );
  }
  return (
    <div className="bg-surface-elev border border-border rounded-lg overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-surface-muted text-left">
          <tr>
            <th className="px-4 py-2 text-xs font-semibold text-text-muted">Loại job</th>
            <th className="px-4 py-2 text-xs font-semibold text-text-muted">Đối tượng</th>
            <th className="px-4 py-2 text-xs font-semibold text-text-muted">Trạng thái</th>
            <th className="px-4 py-2 text-xs font-semibold text-text-muted">Tiến độ</th>
            <th className="px-4 py-2 text-xs font-semibold text-text-muted">Thử lại</th>
            <th className="px-4 py-2 text-xs font-semibold text-text-muted">Cập nhật</th>
          </tr>
        </thead>
        <tbody>
          {jobs.map((job) => (
            <tr
              key={job.id}
              className="border-t border-border hover:bg-surface-muted/50"
            >
              <td className="px-4 py-2 text-text-strong font-medium">
                {job.job_type}
              </td>
              <td className="px-4 py-2 text-text-muted text-xs font-mono truncate max-w-[160px]">
                {job.entity_type}/{job.entity_id.slice(0, 8)}…
              </td>
              <td className="px-4 py-2">
                <JobStatusBadge status={job.status} />
              </td>
              <td className="px-4 py-2 text-text-strong">
                {job.progress_percent}%
              </td>
              <td className="px-4 py-2 text-text-muted">{job.retry_count}</td>
              <td className="px-4 py-2 text-text-muted text-xs">
                {formatDate(job.updated_at)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function AdminCourseDetailPage() {
  const navigate = useNavigate();
  const params = useParams({ strict: false }) as { courseId?: string };
  const courseId = params.courseId ?? "";

  const permissions = useMyPermissions();
  const canAdmin =
    permissions.data?.permissions.includes("system.administer") ?? false;

  useEffect(() => {
    if (permissions.isLoading) return;
    if (!canAdmin) {
      toast.error("Không có quyền truy cập");
      void navigate({ to: "/dashboard", replace: true });
    }
  }, [permissions.isLoading, canAdmin, navigate]);

  const enabled = !permissions.isLoading && canAdmin && Boolean(courseId);
  const audit = useCourseAudit(enabled ? courseId : "");
  const jobs = useCourseProcessingJobs(enabled ? courseId : "", 20);
  const restore = useRestoreCourse();

  if (permissions.isLoading || !canAdmin) {
    return (
      <div className="space-y-3 pb-12">
        <div className="h-6 w-40 bg-surface-muted animate-pulse rounded" />
        <div className="h-24 bg-surface-muted animate-pulse rounded-lg" />
      </div>
    );
  }

  const handleRestore = () => {
    restore.mutate(courseId, {
      onSuccess: () => toast.success("Đã khôi phục khoá học"),
      onError: (err) =>
        toast.error((err as Error).message || "Không thể khôi phục"),
    });
  };

  return (
    <div className="space-y-6 pb-12">
      <Link
        to="/admin/courses"
        className="inline-flex items-center gap-2 text-sm text-text-muted hover:text-text-strong"
      >
        <ArrowLeft className="h-4 w-4" />
        Quay lại danh sách
      </Link>

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-headline font-bold text-text-strong">
            Audit AI khoá học
          </h1>
          <p className="text-sm text-text-muted mt-1 font-mono break-all">
            {courseId}
          </p>
        </div>
        <button
          type="button"
          onClick={handleRestore}
          disabled={restore.isPending}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md bg-m3-primary text-white hover:opacity-90 disabled:opacity-50 transition-opacity"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          {restore.isPending ? "Đang khôi phục..." : "Khôi phục khoá học"}
        </button>
      </div>

      {audit.isError ? (
        <div className="bg-surface-elev border border-border rounded-lg p-5">
          <p className="text-sm text-danger">
            Không thể tải dữ liệu audit.
          </p>
        </div>
      ) : audit.isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-24 bg-surface-muted animate-pulse rounded-xl"
            />
          ))}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard
              label="Tổng chi phí AI"
              value={formatUsd(audit.data?.total_cost_usd)}
              icon={CircleDollarSign}
            />
            <StatCard
              label="Tokens (in + out)"
              value={formatNumber(
                (audit.data?.total_input_tokens ?? 0) +
                  (audit.data?.total_output_tokens ?? 0),
              )}
              icon={Cpu}
            />
            <StatCard
              label="Số lần gọi"
              value={formatNumber(audit.data?.total_calls)}
              icon={ActivityIcon}
            />
            <StatCard
              label="Pipeline runs"
              value={formatNumber(audit.data?.pipeline_runs)}
              icon={HardDrive}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-surface-elev border border-border rounded-lg p-4">
              <p className="text-xs font-semibold text-text-muted uppercase tracking-wide">
                Input tokens
              </p>
              <p className="text-lg font-bold text-text-strong mt-1">
                {formatNumber(audit.data?.total_input_tokens)}
              </p>
            </div>
            <div className="bg-surface-elev border border-border rounded-lg p-4">
              <p className="text-xs font-semibold text-text-muted uppercase tracking-wide">
                Output tokens
              </p>
              <p className="text-lg font-bold text-text-strong mt-1">
                {formatNumber(audit.data?.total_output_tokens)}
              </p>
            </div>
            <div className="bg-surface-elev border border-border rounded-lg p-4">
              <p className="text-xs font-semibold text-text-muted uppercase tracking-wide">
                Lần gọi đầu tiên
              </p>
              <p className="text-sm text-text-strong mt-1">
                {formatDate(audit.data?.first_call_at)}
              </p>
            </div>
            <div className="bg-surface-elev border border-border rounded-lg p-4">
              <p className="text-xs font-semibold text-text-muted uppercase tracking-wide">
                Lần gọi gần nhất
              </p>
              <p className="text-sm text-text-strong mt-1">
                {formatDate(audit.data?.last_call_at)}
              </p>
            </div>
          </div>
        </>
      )}

      <div>
        <h2 className="text-lg font-headline font-bold text-text-strong mb-3">
          Job xử lý gần đây
        </h2>
        {jobs.isError ? (
          <div className="bg-surface-elev border border-border rounded-lg p-5">
            <p className="text-sm text-danger">
              Không thể tải danh sách job.
            </p>
          </div>
        ) : jobs.isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-12 bg-surface-muted animate-pulse rounded-lg"
              />
            ))}
          </div>
        ) : (
          <JobsTable jobs={jobs.data ?? []} />
        )}
      </div>
    </div>
  );
}
