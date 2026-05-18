import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock,
  PauseCircle,
  PlayCircle,
  RefreshCw,
  XCircle,
} from "lucide-react";
import {
  useProcessingJobs,
  useProcessingQueue,
  useRetryProcessingJob,
} from "@/lib/api/hooks/admin";
import { useMyPermissions } from "@/lib/api/hooks/auth";
import { ApiError } from "@/lib/api/client";
import { StatCard } from "@/components/ui/stat-card";
import type { ProcessingJobOut } from "@/lib/api/types";

const STATUS_FILTERS = [
  { value: "", label: "Tất cả" },
  { value: "pending", label: "Đang chờ" },
  { value: "running", label: "Đang chạy" },
  { value: "completed", label: "Hoàn thành" },
  { value: "failed", label: "Thất bại" },
  { value: "cancelled", label: "Đã hủy" },
] as const;

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

function JobsTable({
  jobs,
  onRetry,
  retryingId,
}: {
  jobs: ProcessingJobOut[];
  onRetry: (jobId: string) => void;
  retryingId: string | null;
}) {
  if (jobs.length === 0) {
    return (
      <div className="bg-surface-elev border border-border rounded-lg p-8 text-center">
        <Activity className="h-8 w-8 mx-auto mb-2 text-text-subtle" />
        <p className="text-sm text-text-muted">
          Không có job nào khớp bộ lọc.
        </p>
      </div>
    );
  }
  return (
    <div className="bg-surface-elev border border-border rounded-lg overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-surface-muted text-left">
          <tr>
            <th className="px-4 py-2 text-xs font-semibold text-text-muted">Job</th>
            <th className="px-4 py-2 text-xs font-semibold text-text-muted">Đối tượng</th>
            <th className="px-4 py-2 text-xs font-semibold text-text-muted">Trạng thái</th>
            <th className="px-4 py-2 text-xs font-semibold text-text-muted">Tiến độ</th>
            <th className="px-4 py-2 text-xs font-semibold text-text-muted">Thử lại</th>
            <th className="px-4 py-2 text-xs font-semibold text-text-muted">Cập nhật</th>
            <th className="px-4 py-2 text-xs font-semibold text-text-muted text-right">Hành động</th>
          </tr>
        </thead>
        <tbody>
          {jobs.map((job) => {
            const isFailed = job.status === "failed";
            const isRetrying = retryingId === job.id;
            return (
              <tr
                key={job.id}
                className="border-t border-border hover:bg-surface-muted/50"
              >
                <td className="px-4 py-2">
                  <Link
                    to="/admin/processing/$jobId"
                    params={{ jobId: job.id }}
                    className="text-text-strong font-medium hover:underline"
                  >
                    {job.job_type}
                  </Link>
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
                <td className="px-4 py-2 text-right">
                  {isFailed ? (
                    <button
                      type="button"
                      onClick={() => onRetry(job.id)}
                      disabled={isRetrying}
                      className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-md bg-m3-primary text-white hover:opacity-90 disabled:opacity-50"
                    >
                      <RefreshCw className="h-3 w-3" />
                      {isRetrying ? "..." : "Thử lại"}
                    </button>
                  ) : null}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default function AdminProcessingPage() {
  const navigate = useNavigate();
  const permissions = useMyPermissions();
  const canAdmin =
    permissions.data?.permissions.includes("system.administer") ?? false;

  const [statusFilter, setStatusFilter] = useState<string>("");
  const [retryingId, setRetryingId] = useState<string | null>(null);

  useEffect(() => {
    if (permissions.isLoading) return;
    if (!canAdmin) {
      toast.error("Không có quyền truy cập");
      void navigate({ to: "/dashboard", replace: true });
    }
  }, [permissions.isLoading, canAdmin, navigate]);

  const queue = useProcessingQueue();
  const jobs = useProcessingJobs(
    statusFilter ? { status: statusFilter } : undefined,
  );
  const retry = useRetryProcessingJob();

  const sortedJobs = useMemo<ProcessingJobOut[]>(() => {
    const list = jobs.data ?? [];
    return [...list].sort((a, b) =>
      a.updated_at < b.updated_at ? 1 : a.updated_at > b.updated_at ? -1 : 0,
    );
  }, [jobs.data]);

  if (permissions.isLoading || !canAdmin) {
    return (
      <div className="space-y-3 pb-12">
        <div className="h-6 w-40 bg-surface-muted animate-pulse rounded" />
        <div className="h-32 bg-surface-muted animate-pulse rounded-lg" />
      </div>
    );
  }

  const handleRetry = (jobId: string) => {
    setRetryingId(jobId);
    retry.mutate(jobId, {
      onSuccess: () => toast.success("Đã đưa job vào hàng đợi"),
      onError: (err) => {
        if (err instanceof ApiError && err.status === 409) {
          toast.error("Chỉ có thể thử lại các job đã thất bại");
        } else {
          toast.error((err as Error).message || "Không thể thử lại");
        }
      },
      onSettled: () => setRetryingId(null),
    });
  };

  return (
    <div className="space-y-6 pb-12">
      <div>
        <h1 className="text-xl font-headline font-bold text-text-strong">
          Hàng đợi xử lý
        </h1>
        <p className="text-sm text-text-muted mt-1">
          Theo dõi job nền AI và độ sâu hàng đợi ARQ.
        </p>
      </div>

      {queue.isError ? (
        <div className="bg-surface-elev border border-border rounded-lg p-5">
          <p className="text-sm text-danger">
            Không thể tải độ sâu hàng đợi.
          </p>
        </div>
      ) : queue.isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="h-24 bg-surface-muted animate-pulse rounded-xl"
            />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
          <StatCard
            label="Tổng job"
            value={formatNumber(queue.data?.total)}
            icon={Activity}
          />
          <StatCard
            label="Đang chờ"
            value={formatNumber(queue.data?.pending)}
            icon={Clock}
          />
          <StatCard
            label="Đang chạy"
            value={formatNumber(queue.data?.running)}
            icon={PlayCircle}
          />
          <StatCard
            label="Hoàn thành"
            value={formatNumber(queue.data?.completed)}
            icon={CheckCircle2}
          />
          <StatCard
            label="Thất bại"
            value={formatNumber(queue.data?.failed)}
            icon={AlertTriangle}
          />
          <StatCard
            label="Đã hủy"
            value={formatNumber(queue.data?.cancelled)}
            icon={XCircle}
          />
        </div>
      )}

      <div className="bg-surface-elev border border-border rounded-lg p-4">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-semibold text-text-muted mr-2">
            Lọc trạng thái:
          </span>
          {STATUS_FILTERS.map((opt) => {
            const active = statusFilter === opt.value;
            return (
              <button
                type="button"
                key={opt.value || "all"}
                onClick={() => setStatusFilter(opt.value)}
                className={
                  active
                    ? "px-3 py-1.5 text-xs font-semibold rounded-md bg-m3-primary text-white"
                    : "px-3 py-1.5 text-xs font-semibold rounded-md bg-surface-muted text-text-strong hover:bg-surface-muted/70"
                }
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <h2 className="text-lg font-headline font-bold text-text-strong mb-3">
          Job gần đây (7 ngày)
        </h2>
        {jobs.isError ? (
          <div className="bg-surface-elev border border-border rounded-lg p-5">
            <p className="text-sm text-danger">Không thể tải danh sách job.</p>
          </div>
        ) : jobs.isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="h-12 bg-surface-muted animate-pulse rounded-lg"
              />
            ))}
          </div>
        ) : (
          <JobsTable
            jobs={sortedJobs}
            onRetry={handleRetry}
            retryingId={retryingId}
          />
        )}
      </div>
    </div>
  );
}
