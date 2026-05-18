import { useHealthz, useReadyz } from "@/lib/api/hooks/infra";
import type { HealthzResponse, ReadyzResponse } from "@/lib/api/hooks/infra";

function StatusBadge({ status }: { status: string | undefined }) {
  if (!status) return null;

  const color =
    status === "ok"
      ? "bg-emerald-100 text-emerald-700"
      : status === "degraded"
        ? "bg-amber-100 text-amber-700"
        : "bg-red-100 text-red-700";

  return (
    <span className={`inline-block px-2 py-0.5 text-xs font-semibold rounded-md ${color}`}>
      {status}
    </span>
  );
}

function HealthCard({
  title,
  data,
  isLoading,
  isError,
  dataUpdatedAt,
}: {
  title: string;
  data: HealthzResponse | ReadyzResponse | undefined;
  isLoading: boolean;
  isError: boolean;
  dataUpdatedAt: number;
}) {
  const status = data && typeof data === "object" ? String((data as Record<string, unknown>).status ?? "unknown") : undefined;
  const lastFetched = dataUpdatedAt ? new Date(dataUpdatedAt).toLocaleTimeString("vi-VN") : "—";

  if (isLoading) {
    return (
      <div className="bg-surface-elev border border-border rounded-lg p-5">
        <div className="h-4 w-32 bg-surface-muted animate-pulse rounded" />
        <div className="h-6 w-16 bg-surface-muted animate-pulse rounded mt-3" />
        <div className="h-3 w-24 bg-surface-muted animate-pulse rounded mt-2" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="bg-surface-elev border border-border rounded-lg p-5">
        <h3 className="text-sm font-semibold text-text-strong">{title}</h3>
        <p className="text-xs text-red-600 mt-2">Không thể kết nối đến máy chủ.</p>
      </div>
    );
  }

  return (
    <div className="bg-surface-elev border border-border rounded-lg p-5">
      <h3 className="text-sm font-semibold text-text-strong">{title}</h3>
      <div className="mt-3">
        <StatusBadge status={status} />
      </div>
      <p className="text-xs text-text-muted mt-2">Cập nhật lúc: {lastFetched}</p>
    </div>
  );
}

export default function AdminHealthPage() {
  const healthz = useHealthz();
  const readyz = useReadyz();

  return (
    <div className="space-y-6 pb-12">
      <div>
        <h1 className="text-xl font-headline font-bold text-text-strong">
          Trạng thái hệ thống
        </h1>
        <p className="text-sm text-text-muted mt-1">
          Kiểm tra sức khỏe và sẵn sàng của backend.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <HealthCard
          title="Kiểm tra sức khỏe API"
          data={healthz.data}
          isLoading={healthz.isLoading}
          isError={healthz.isError}
          dataUpdatedAt={healthz.dataUpdatedAt}
        />
        <HealthCard
          title="Kiểm tra sẵn sàng"
          data={readyz.data}
          isLoading={readyz.isLoading}
          isError={readyz.isError}
          dataUpdatedAt={readyz.dataUpdatedAt}
        />
      </div>
    </div>
  );
}
