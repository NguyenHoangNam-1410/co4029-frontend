import { Activity, Calendar, CalendarDays, Users } from "lucide-react";
import { useActiveUsersStats } from "@/lib/api/hooks/admin";

function formatCount(n: number | undefined): string {
  if (n === undefined || n === null) return "—";
  return new Intl.NumberFormat("vi-VN").format(n);
}

export default function AdminStatsActivePage() {
  const { data, isLoading, isError } = useActiveUsersStats();

  const rows = [
    {
      key: "dau",
      label: "Người dùng hoạt động hằng ngày (DAU)",
      desc: "Số người dùng có hoạt động trong 24 giờ qua",
      value: data?.dau,
      icon: Activity,
    },
    {
      key: "wau",
      label: "Người dùng hoạt động hằng tuần (WAU)",
      desc: "Số người dùng có hoạt động trong 7 ngày qua",
      value: data?.wau,
      icon: Calendar,
    },
    {
      key: "mau",
      label: "Người dùng hoạt động hằng tháng (MAU)",
      desc: "Số người dùng có hoạt động trong 30 ngày qua",
      value: data?.mau,
      icon: CalendarDays,
    },
  ];

  return (
    <div className="space-y-6 pb-12">
      <div>
        <h1 className="text-xl font-headline font-bold text-text-strong">
          Người dùng hoạt động
        </h1>
        <p className="text-sm text-text-muted mt-1">
          Phân tích DAU/WAU/MAU theo phạm vi quyền của bạn.
        </p>
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
          <Users className="h-10 w-10 mx-auto mb-3 text-text-subtle" />
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
