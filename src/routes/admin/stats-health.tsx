import { useMemo, useState } from "react";
import { AlertTriangle, Bot, Loader } from "lucide-react";
import { useStatsHealth } from "@/lib/api/hooks/admin";

type Window = "24h" | "7d" | "30d";

const WINDOW_OPTIONS: { value: Window; label: string; hours: number }[] = [
  { value: "24h", label: "24 giờ qua", hours: 24 },
  { value: "7d", label: "7 ngày qua", hours: 24 * 7 },
  { value: "30d", label: "30 ngày qua", hours: 24 * 30 },
];

function formatCount(n: number | undefined): string {
  if (n === undefined || n === null) return "—";
  return new Intl.NumberFormat("vi-VN").format(n);
}

export default function AdminStatsHealthPage() {
  const [windowKey, setWindowKey] = useState<Window>("24h");

  const since = useMemo(() => {
    const opt = WINDOW_OPTIONS.find((w) => w.value === windowKey)!;
    const ms = opt.hours * 60 * 60 * 1000;
    return new Date(Date.now() - ms).toISOString();
  }, [windowKey]);

  const { data, isLoading, isError } = useStatsHealth(since);

  const rows = [
    {
      key: "failed_jobs",
      label: "Tác vụ thất bại",
      desc: "Số job xử lý có trạng thái failed",
      value: data?.failed_jobs_count,
      icon: AlertTriangle,
    },
    {
      key: "in_flight_jobs",
      label: "Tác vụ đang chạy",
      desc: "Số job đang ở trạng thái in-flight",
      value: data?.in_flight_jobs_count,
      icon: Loader,
    },
    {
      key: "failed_ai_calls",
      label: "Lệnh gọi AI thất bại",
      desc: "Số AI call có trạng thái thất bại",
      value: data?.failed_ai_calls_count,
      icon: Bot,
    },
  ];

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-headline font-bold text-text-strong">
            Trạng thái xử lý nền
          </h1>
          <p className="text-sm text-text-muted mt-1">
            Snapshot job nền và lệnh gọi AI thất bại trong khoảng thời gian được
            chọn.
          </p>
        </div>

        <div>
          <label
            htmlFor="health-window"
            className="block text-xs font-semibold uppercase tracking-wider text-text-muted mb-1"
          >
            Khoảng thời gian
          </label>
          <select
            id="health-window"
            value={windowKey}
            onChange={(e) => setWindowKey(e.target.value as Window)}
            className="bg-surface-elev border border-border rounded-md px-3 py-2 text-sm text-text-strong focus:outline-none focus:ring-2 focus:ring-m3-primary"
          >
            {WINDOW_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {isError ? (
        <div className="bg-surface-elev border border-border rounded-lg p-5">
          <p className="text-sm text-danger">
            Không thể tải dữ liệu. Vui lòng thử lại sau.
          </p>
        </div>
      ) : isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-16 bg-surface-muted animate-pulse rounded-xl"
            />
          ))}
        </div>
      ) : !data ? (
        <div className="bg-surface-elev border border-border rounded-lg p-10 text-center">
          <AlertTriangle className="h-10 w-10 mx-auto mb-3 text-text-subtle" />
          <p className="text-sm font-medium text-text-strong">
            Chưa có dữ liệu cho phạm vi này
          </p>
        </div>
      ) : (
        <div className="bg-surface-elev border border-border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-surface-muted text-left text-xs uppercase tracking-wider text-text-muted">
                <th className="px-5 py-3 font-semibold">Chỉ số</th>
                <th className="px-5 py-3 font-semibold">Mô tả</th>
                <th className="px-5 py-3 font-semibold text-right">Giá trị</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, idx) => {
                const Icon = row.icon;
                return (
                  <tr
                    key={row.key}
                    className={
                      idx === rows.length - 1
                        ? ""
                        : "border-b border-border"
                    }
                  >
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-m3-primary-fixed flex items-center justify-center">
                          <Icon className="h-4 w-4 text-m3-primary" />
                        </div>
                        <span className="font-medium text-text-strong">
                          {row.label}
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-text-muted">{row.desc}</td>
                    <td className="px-5 py-4 text-right font-heading font-semibold text-text-strong">
                      {formatCount(row.value)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
