import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import {
  Activity,
  CircleDollarSign,
  Clock,
  Cpu,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  useAiCostsByPipeline,
  useAiCostsByUser,
  useAiCostsSummary,
  useRecentAiCalls,
  type AiCostsPeriod,
} from "@/lib/api/hooks/admin";
import { useMyPermissions } from "@/lib/api/hooks/auth";
import { StatCard } from "@/components/ui/stat-card";
import type {
  AiCostsByPipeline as AiCostsByPipelineRow,
  AiCostsByUser as AiCostsByUserRow,
  AiCostsRecentCall,
  AiCostsRoleBreakdown,
  AiCostsStageBreakdown,
} from "@/lib/api/types";

const PERIOD_OPTIONS: { value: AiCostsPeriod; label: string }[] = [
  { value: "24h", label: "24 giờ qua" },
  { value: "7d", label: "7 ngày qua" },
  { value: "30d", label: "30 ngày qua" },
];

const PERIOD_LABEL: Record<AiCostsPeriod, string> = {
  "24h": "24 giờ",
  "7d": "7 ngày",
  "30d": "30 ngày",
};

const usdFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 4,
});

const numberFormatter = new Intl.NumberFormat("vi-VN");

const dateFormatter = new Intl.DateTimeFormat("vi-VN", {
  dateStyle: "short",
  timeStyle: "short",
});

function formatUsd(value: number | null | undefined): string {
  if (value === undefined || value === null) return "—";
  return usdFormatter.format(value);
}

function formatNumber(value: number | null | undefined): string {
  if (value === undefined || value === null) return "—";
  return numberFormatter.format(value);
}

function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  return dateFormatter.format(new Date(iso));
}

function ChartTooltipUsd({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { value: number; payload: Record<string, unknown> }[];
  label?: string;
}) {
  if (!active || !payload || payload.length === 0) return null;
  const value = payload[0].value;
  return (
    <div className="bg-surface-elev border border-border rounded-md px-3 py-2 shadow-editorial">
      <p className="text-xs font-semibold text-text-strong">{label}</p>
      <p className="text-xs text-text-muted mt-0.5">{formatUsd(value)}</p>
    </div>
  );
}

function PeriodSelector({
  value,
  onChange,
}: {
  value: AiCostsPeriod;
  onChange: (next: AiCostsPeriod) => void;
}) {
  return (
    <div
      role="radiogroup"
      aria-label="Khoảng thời gian"
      className="inline-flex flex-wrap gap-2 bg-surface-elev border border-border rounded-lg p-1"
    >
      {PERIOD_OPTIONS.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(opt.value)}
            className={
              active
                ? "px-3 py-1.5 text-xs font-semibold rounded-md bg-m3-primary text-white cursor-pointer"
                : "px-3 py-1.5 text-xs font-semibold rounded-md text-text-strong hover:bg-surface-muted cursor-pointer transition-colors duration-200"
            }
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

function RoleBarChart({ data }: { data: AiCostsRoleBreakdown[] }) {
  if (data.length === 0) {
    return (
      <div className="bg-surface-elev border border-border rounded-lg p-8 text-center">
        <p className="text-sm text-text-muted">
          Chưa có dữ liệu chi phí theo vai trò.
        </p>
      </div>
    );
  }
  return (
    <div className="bg-surface-elev border border-border rounded-lg p-4">
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
          <CartesianGrid
            stroke="var(--color-border)"
            strokeDasharray="3 3"
            vertical={false}
          />
          <XAxis
            dataKey="role"
            tick={{ fill: "var(--color-text-muted)", fontSize: 12 }}
            stroke="var(--color-border)"
          />
          <YAxis
            tick={{ fill: "var(--color-text-muted)", fontSize: 12 }}
            stroke="var(--color-border)"
            tickFormatter={(value: number) => formatUsd(value)}
            width={80}
          />
          <Tooltip content={<ChartTooltipUsd />} cursor={{ fill: "var(--color-surface-muted)" }} />
          <Bar dataKey="usd" fill="var(--color-primary)" radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function StageBarChart({ data }: { data: AiCostsStageBreakdown[] }) {
  if (data.length === 0) {
    return (
      <div className="bg-surface-elev border border-border rounded-lg p-8 text-center">
        <p className="text-sm text-text-muted">
          Chưa có dữ liệu chi phí theo bước.
        </p>
      </div>
    );
  }
  return (
    <div className="bg-surface-elev border border-border rounded-lg p-4">
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
          <CartesianGrid
            stroke="var(--color-border)"
            strokeDasharray="3 3"
            vertical={false}
          />
          <XAxis
            dataKey="stage_name"
            tick={{ fill: "var(--color-text-muted)", fontSize: 12 }}
            stroke="var(--color-border)"
          />
          <YAxis
            tick={{ fill: "var(--color-text-muted)", fontSize: 12 }}
            stroke="var(--color-border)"
            tickFormatter={(value: number) => formatUsd(value)}
            width={80}
          />
          <Tooltip content={<ChartTooltipUsd />} cursor={{ fill: "var(--color-surface-muted)" }} />
          <Bar dataKey="usd" fill="var(--color-primary)" radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function TopUsersTable({ rows }: { rows: AiCostsByUserRow[] }) {
  if (rows.length === 0) {
    return (
      <div className="bg-surface-elev border border-border rounded-lg p-8 text-center">
        <p className="text-sm text-text-muted">
          Chưa có người dùng nào phát sinh chi phí.
        </p>
      </div>
    );
  }
  return (
    <div className="bg-surface-elev border border-border rounded-lg overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-surface-muted text-left">
          <tr>
            <th className="px-4 py-2 text-xs font-semibold text-text-muted">
              Người dùng
            </th>
            <th className="px-4 py-2 text-xs font-semibold text-text-muted text-right">
              Tổng chi phí
            </th>
            <th className="px-4 py-2 text-xs font-semibold text-text-muted text-right">
              Tổng tokens
            </th>
            <th className="px-4 py-2 text-xs font-semibold text-text-muted text-right">
              Số lượt gọi
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.user_id}
              className="border-t border-border hover:bg-surface-muted/50"
            >
              <td className="px-4 py-2 text-text-strong font-medium">
                {row.display_name}
              </td>
              <td className="px-4 py-2 text-right text-text-strong tabular-nums">
                {formatUsd(row.total_usd)}
              </td>
              <td className="px-4 py-2 text-right text-text-muted tabular-nums">
                {formatNumber(row.total_tokens)}
              </td>
              <td className="px-4 py-2 text-right text-text-muted tabular-nums">
                {formatNumber(row.call_count)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PipelineTable({ rows }: { rows: AiCostsByPipelineRow[] }) {
  if (rows.length === 0) {
    return (
      <div className="bg-surface-elev border border-border rounded-lg p-8 text-center">
        <p className="text-sm text-text-muted">
          Chưa có pipeline nào trong khoảng thời gian này.
        </p>
      </div>
    );
  }
  return (
    <div className="bg-surface-elev border border-border rounded-lg overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-surface-muted text-left">
          <tr>
            <th className="px-4 py-2 text-xs font-semibold text-text-muted">
              Pipeline
            </th>
            <th className="px-4 py-2 text-xs font-semibold text-text-muted">
              Loại
            </th>
            <th className="px-4 py-2 text-xs font-semibold text-text-muted text-right">
              Số lượt gọi
            </th>
            <th className="px-4 py-2 text-xs font-semibold text-text-muted text-right">
              Tổng tokens
            </th>
            <th className="px-4 py-2 text-xs font-semibold text-text-muted text-right">
              Tổng chi phí
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.pipeline_run_id}
              className="border-t border-border hover:bg-surface-muted/50"
            >
              <td className="px-4 py-2 text-text-strong font-mono text-xs truncate max-w-[200px]">
                {row.pipeline_run_id.slice(0, 8)}…
              </td>
              <td className="px-4 py-2 text-text-muted">
                {row.generation_type ?? "—"}
              </td>
              <td className="px-4 py-2 text-right text-text-muted tabular-nums">
                {formatNumber(row.call_count)}
              </td>
              <td className="px-4 py-2 text-right text-text-muted tabular-nums">
                {formatNumber(row.total_tokens)}
              </td>
              <td className="px-4 py-2 text-right text-text-strong tabular-nums">
                {formatUsd(row.total_usd)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function RecentCallsTable({ rows }: { rows: AiCostsRecentCall[] }) {
  if (rows.length === 0) {
    return (
      <div className="bg-surface-elev border border-border rounded-lg p-8 text-center">
        <p className="text-sm text-text-muted">
          Chưa có lượt gọi AI nào gần đây.
        </p>
      </div>
    );
  }
  return (
    <div className="bg-surface-elev border border-border rounded-lg overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-surface-muted text-left">
          <tr>
            <th className="px-4 py-2 text-xs font-semibold text-text-muted">
              Thời điểm
            </th>
            <th className="px-4 py-2 text-xs font-semibold text-text-muted">
              Mô hình
            </th>
            <th className="px-4 py-2 text-xs font-semibold text-text-muted">
              Vai trò
            </th>
            <th className="px-4 py-2 text-xs font-semibold text-text-muted">
              Bước
            </th>
            <th className="px-4 py-2 text-xs font-semibold text-text-muted text-right">
              Độ trễ
            </th>
            <th className="px-4 py-2 text-xs font-semibold text-text-muted text-right">
              Tokens
            </th>
            <th className="px-4 py-2 text-xs font-semibold text-text-muted text-right">
              Chi phí
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.id}
              className="border-t border-border hover:bg-surface-muted/50"
            >
              <td className="px-4 py-2 text-text-muted text-xs whitespace-nowrap">
                {formatDateTime(row.created_at)}
              </td>
              <td className="px-4 py-2 text-text-strong text-xs font-mono">
                {row.model ?? "—"}
              </td>
              <td className="px-4 py-2 text-text-muted">{row.role ?? "—"}</td>
              <td className="px-4 py-2 text-text-muted">
                {row.stage_name ?? "—"}
              </td>
              <td className="px-4 py-2 text-right text-text-muted tabular-nums">
                {row.latency_ms !== null && row.latency_ms !== undefined
                  ? `${formatNumber(row.latency_ms)} ms`
                  : "—"}
              </td>
              <td className="px-4 py-2 text-right text-text-muted tabular-nums">
                {formatNumber(row.tokens)}
              </td>
              <td className="px-4 py-2 text-right text-text-strong tabular-nums">
                {formatUsd(row.usd)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function AdminAiCostsPage() {
  const navigate = useNavigate();
  const permissions = useMyPermissions();
  const canAdmin =
    permissions.data?.permissions.includes("system.administer") ?? false;

  const [period, setPeriod] = useState<AiCostsPeriod>("30d");

  useEffect(() => {
    if (permissions.isLoading) return;
    if (!canAdmin) {
      toast.error("Không có quyền truy cập");
      void navigate({ to: "/dashboard", replace: true });
    }
  }, [permissions.isLoading, canAdmin, navigate]);

  const summary = useAiCostsSummary(period);
  const byUser = useAiCostsByUser({ period, topN: 20 });
  const byPipeline = useAiCostsByPipeline({ period });
  const recent = useRecentAiCalls({ limit: 50 });

  if (permissions.isLoading || !canAdmin) {
    return (
      <div className="space-y-3 pb-12">
        <div className="h-6 w-40 bg-surface-muted animate-pulse rounded" />
        <div className="h-32 bg-surface-muted animate-pulse rounded-lg" />
      </div>
    );
  }

  const totals = summary.data?.totals;

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-headline font-bold text-text-strong">
            Chi phí AI
          </h1>
          <p className="text-sm text-text-muted mt-1">
            Theo dõi mức tiêu thụ token và chi phí của các pipeline AI.
          </p>
        </div>
        <PeriodSelector value={period} onChange={setPeriod} />
      </div>

      {summary.isError ? (
        <div className="bg-surface-elev border border-border rounded-lg p-5">
          <p className="text-sm text-danger">
            Không thể tải tổng quan chi phí.
          </p>
        </div>
      ) : summary.isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-24 bg-surface-muted animate-pulse rounded-xl"
            />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            label="Tổng chi phí"
            value={formatUsd(totals?.usd)}
            icon={CircleDollarSign}
          />
          <StatCard
            label="Tổng tokens"
            value={formatNumber(totals?.tokens)}
            icon={Cpu}
          />
          <StatCard
            label="Số lượt gọi"
            value={formatNumber(totals?.call_count)}
            icon={Activity}
          />
          <StatCard
            label="Khoảng thời gian"
            value={PERIOD_LABEL[period]}
            icon={Clock}
          />
        </div>
      )}

      <section className="space-y-3">
        <h2 className="text-lg font-headline font-bold text-text-strong">
          Chi phí theo vai trò
        </h2>
        {summary.isLoading ? (
          <div className="h-[300px] bg-surface-muted animate-pulse rounded-lg" />
        ) : (
          <RoleBarChart data={summary.data?.by_role ?? []} />
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-headline font-bold text-text-strong">
          Chi phí theo bước xử lý
        </h2>
        {summary.isLoading ? (
          <div className="h-[300px] bg-surface-muted animate-pulse rounded-lg" />
        ) : (
          <StageBarChart data={summary.data?.by_stage ?? []} />
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-headline font-bold text-text-strong">
          Người dùng tốn chi phí cao nhất
        </h2>
        {byUser.isError ? (
          <div className="bg-surface-elev border border-border rounded-lg p-5">
            <p className="text-sm text-danger">
              Không thể tải bảng người dùng.
            </p>
          </div>
        ) : byUser.isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-12 bg-surface-muted animate-pulse rounded-lg"
              />
            ))}
          </div>
        ) : (
          <TopUsersTable rows={byUser.data ?? []} />
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-headline font-bold text-text-strong">
          Pipeline tốn chi phí cao nhất
        </h2>
        {byPipeline.isError ? (
          <div className="bg-surface-elev border border-border rounded-lg p-5">
            <p className="text-sm text-danger">
              Không thể tải bảng pipeline.
            </p>
          </div>
        ) : byPipeline.isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-12 bg-surface-muted animate-pulse rounded-lg"
              />
            ))}
          </div>
        ) : (
          <PipelineTable rows={byPipeline.data ?? []} />
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-headline font-bold text-text-strong">
          Lượt gọi AI gần đây
        </h2>
        {recent.isError ? (
          <div className="bg-surface-elev border border-border rounded-lg p-5">
            <p className="text-sm text-danger">
              Không thể tải danh sách lượt gọi.
            </p>
          </div>
        ) : recent.isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className="h-12 bg-surface-muted animate-pulse rounded-lg"
              />
            ))}
          </div>
        ) : (
          <RecentCallsTable rows={recent.data ?? []} />
        )}
      </section>
    </div>
  );
}
