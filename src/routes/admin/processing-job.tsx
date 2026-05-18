import { useEffect } from "react";
import { Link, useNavigate, useParams } from "@tanstack/react-router";
import { toast } from "sonner";
import { ArrowLeft, RefreshCw } from "lucide-react";
import {
  useProcessingJob,
  useRetryProcessingJob,
} from "@/lib/api/hooks/admin";
import { useMyPermissions } from "@/lib/api/hooks/auth";
import { ApiError } from "@/lib/api/client";

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
      className={`inline-block px-2 py-0.5 text-xs font-semibold rounded-md ${cls}`}
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

function Field({
  label,
  value,
  mono,
}: {
  label: string;
  value: React.ReactNode;
  mono?: boolean;
}) {
  return (
    <div>
      <dt className="text-xs font-semibold text-text-muted uppercase tracking-wide">
        {label}
      </dt>
      <dd
        className={
          mono
            ? "text-sm text-text-strong mt-1 font-mono break-all"
            : "text-sm text-text-strong mt-1"
        }
      >
        {value}
      </dd>
    </div>
  );
}

export default function AdminProcessingJobPage() {
  const navigate = useNavigate();
  const params = useParams({ strict: false }) as { jobId?: string };
  const jobId = params.jobId ?? "";

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

  const enabled = !permissions.isLoading && canAdmin && Boolean(jobId);
  const job = useProcessingJob(enabled ? jobId : "");
  const retry = useRetryProcessingJob();

  if (permissions.isLoading || !canAdmin) {
    return (
      <div className="space-y-3 pb-12">
        <div className="h-6 w-40 bg-surface-muted animate-pulse rounded" />
        <div className="h-32 bg-surface-muted animate-pulse rounded-lg" />
      </div>
    );
  }

  const handleRetry = () => {
    retry.mutate(jobId, {
      onSuccess: () => toast.success("Đã đưa job vào hàng đợi"),
      onError: (err) => {
        if (err instanceof ApiError && err.status === 409) {
          toast.error("Chỉ có thể thử lại các job đã thất bại");
        } else {
          toast.error((err as Error).message || "Không thể thử lại");
        }
      },
    });
  };

  const data = job.data;
  const isFailed = data?.status === "failed";

  return (
    <div className="space-y-6 pb-12">
      <Link
        to="/admin/processing"
        className="inline-flex items-center gap-2 text-sm text-text-muted hover:text-text-strong"
      >
        <ArrowLeft className="h-4 w-4" />
        Quay lại hàng đợi
      </Link>

      {job.isError ? (
        <div className="bg-surface-elev border border-border rounded-lg p-5">
          <p className="text-sm text-danger">Không thể tải chi tiết job.</p>
        </div>
      ) : job.isLoading ? (
        <div className="space-y-3">
          <div className="h-32 bg-surface-muted animate-pulse rounded-lg" />
          <div className="h-24 bg-surface-muted animate-pulse rounded-lg" />
        </div>
      ) : data ? (
        <>
          <div className="bg-surface-elev border border-border rounded-xl p-6">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-xl font-headline font-bold text-text-strong">
                    {data.job_type}
                  </h1>
                  <JobStatusBadge status={data.status} />
                </div>
                <p className="text-xs text-text-subtle mt-2 font-mono break-all">
                  {data.id}
                </p>
              </div>
              {isFailed ? (
                <button
                  type="button"
                  onClick={handleRetry}
                  disabled={retry.isPending}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md bg-m3-primary text-white hover:opacity-90 disabled:opacity-50"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  {retry.isPending ? "Đang xử lý..." : "Thử lại job"}
                </button>
              ) : null}
            </div>
          </div>

          <div className="bg-surface-elev border border-border rounded-lg p-5">
            <h2 className="text-sm font-headline font-bold text-text-strong mb-4">
              Chi tiết
            </h2>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
              <Field label="Loại đối tượng" value={data.entity_type} />
              <Field label="ID đối tượng" value={data.entity_id} mono />
              <Field
                label="Tiến độ"
                value={`${data.progress_percent}%`}
              />
              <Field label="Số lần thử lại" value={data.retry_count} />
              <Field
                label="Bắt đầu"
                value={formatDate(data.started_at)}
              />
              <Field
                label="Kết thúc"
                value={formatDate(data.finished_at)}
              />
              <Field
                label="Tạo lúc"
                value={formatDate(data.created_at)}
              />
              <Field
                label="Cập nhật"
                value={formatDate(data.updated_at)}
              />
            </dl>
          </div>

          {data.error_message ? (
            <div className="bg-red-50 border border-red-200 rounded-lg p-5">
              <h2 className="text-sm font-headline font-bold text-red-700 mb-2">
                Lỗi
              </h2>
              <pre className="text-xs text-red-700 whitespace-pre-wrap break-all font-mono">
                {data.error_message}
              </pre>
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
