import { BookOpen, ClipboardCheck, FileText, GraduationCap, Users } from "lucide-react";
import { StatCard } from "@/components/ui/stat-card";
import { useAdminStatsOverview } from "@/lib/api/hooks/admin";

function formatCount(n: number | undefined): string {
  if (n === undefined || n === null) return "—";
  return new Intl.NumberFormat("vi-VN").format(n);
}

export default function AdminStatsPage() {
  const { data, isLoading, isError } = useAdminStatsOverview();

  const isEmpty =
    !isLoading &&
    !isError &&
    data !== undefined &&
    data.total_users === 0 &&
    data.total_courses === 0 &&
    data.total_enrollments === 0 &&
    data.total_materials === 0 &&
    data.total_quiz_attempts === 0;

  return (
    <div className="space-y-6 pb-12">
      <div>
        <h1 className="text-xl font-headline font-bold text-text-strong">
          Tổng quan hệ thống
        </h1>
        <p className="text-sm text-text-muted mt-1">
          Các chỉ số tổng hợp trong phạm vi quyền của bạn.
        </p>
      </div>

      {isError ? (
        <div className="bg-surface-elev border border-border rounded-lg p-5">
          <p className="text-sm text-danger">
            Không thể tải dữ liệu. Vui lòng thử lại sau.
          </p>
        </div>
      ) : isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="h-24 bg-surface-muted animate-pulse rounded-xl"
            />
          ))}
        </div>
      ) : isEmpty ? (
        <div className="bg-surface-elev border border-border rounded-lg p-10 text-center">
          <BookOpen className="h-10 w-10 mx-auto mb-3 text-text-subtle" />
          <p className="text-sm font-medium text-text-strong">
            Chưa có dữ liệu cho phạm vi này
          </p>
          <p className="text-xs text-text-muted mt-1">
            Khi có hoạt động, các chỉ số sẽ xuất hiện tại đây.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
          <StatCard
            label="Người dùng"
            value={formatCount(data?.total_users)}
            icon={Users}
          />
          <StatCard
            label="Khoá học"
            value={formatCount(data?.total_courses)}
            icon={BookOpen}
          />
          <StatCard
            label="Đăng ký"
            value={formatCount(data?.total_enrollments)}
            icon={GraduationCap}
          />
          <StatCard
            label="Tài liệu"
            value={formatCount(data?.total_materials)}
            icon={FileText}
          />
          <StatCard
            label="Lượt làm quiz"
            value={formatCount(data?.total_quiz_attempts)}
            icon={ClipboardCheck}
          />
        </div>
      )}
    </div>
  );
}
