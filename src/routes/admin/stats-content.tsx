import { BookOpen, FileText, Workflow } from "lucide-react";
import { useContentStats } from "@/lib/api/hooks/admin";

type Bucket = { [key: string]: unknown };

function formatCount(n: unknown): string {
  if (typeof n === "number") return new Intl.NumberFormat("vi-VN").format(n);
  return "—";
}

function readBucket(bucket: Bucket): { label: string; count: unknown } {
  const labelKey = ["status", "type", "kind", "name"].find(
    (k) => k in bucket && typeof bucket[k] === "string",
  );
  const countKey = ["count", "total", "n"].find(
    (k) => k in bucket && typeof bucket[k] === "number",
  );
  return {
    label: labelKey ? String(bucket[labelKey]) : "—",
    count: countKey ? bucket[countKey] : "—",
  };
}

function BreakdownTable({
  title,
  icon: Icon,
  buckets,
  labelHeader,
}: {
  title: string;
  icon: typeof BookOpen;
  buckets: Bucket[] | undefined;
  labelHeader: string;
}) {
  return (
    <div className="bg-surface-elev border border-border rounded-xl overflow-hidden">
      <div className="px-5 py-4 border-b border-border flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-m3-primary-fixed flex items-center justify-center">
          <Icon className="h-4 w-4 text-m3-primary" />
        </div>
        <h2 className="font-headline font-semibold text-text-strong">
          {title}
        </h2>
      </div>
      {!buckets || buckets.length === 0 ? (
        <div className="px-5 py-8 text-center text-sm text-text-muted">
          Chưa có dữ liệu cho phạm vi này
        </div>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-surface-muted text-left text-xs uppercase tracking-wider text-text-muted">
              <th className="px-5 py-3 font-semibold">{labelHeader}</th>
              <th className="px-5 py-3 font-semibold text-right">Số lượng</th>
            </tr>
          </thead>
          <tbody>
            {buckets.map((bucket, idx) => {
              const { label, count } = readBucket(bucket);
              return (
                <tr
                  key={`${label}-${idx}`}
                  className={
                    idx === buckets.length - 1 ? "" : "border-b border-border"
                  }
                >
                  <td className="px-5 py-3 text-text-strong">{label}</td>
                  <td className="px-5 py-3 text-right font-medium text-text-strong">
                    {formatCount(count)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default function AdminStatsContentPage() {
  const { data, isLoading, isError } = useContentStats();

  return (
    <div className="space-y-6 pb-12">
      <div>
        <h1 className="text-xl font-headline font-bold text-text-strong">
          Phân tích nội dung
        </h1>
        <p className="text-sm text-text-muted mt-1">
          Số lượng nội dung theo trạng thái và loại.
        </p>
      </div>

      {isError ? (
        <div className="bg-surface-elev border border-border rounded-lg p-5">
          <p className="text-sm text-danger">
            Không thể tải dữ liệu. Vui lòng thử lại sau.
          </p>
        </div>
      ) : isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-32 bg-surface-muted animate-pulse rounded-xl"
            />
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          <BreakdownTable
            title="Khoá học theo trạng thái"
            icon={BookOpen}
            buckets={data?.courses_by_status}
            labelHeader="Trạng thái"
          />
          <BreakdownTable
            title="Tài liệu theo loại"
            icon={FileText}
            buckets={data?.materials_by_type}
            labelHeader="Loại"
          />
          <BreakdownTable
            title="Tác vụ xử lý theo trạng thái"
            icon={Workflow}
            buckets={data?.processing_jobs_by_status}
            labelHeader="Trạng thái"
          />
        </div>
      )}
    </div>
  );
}
