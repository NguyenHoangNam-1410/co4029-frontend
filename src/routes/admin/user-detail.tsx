import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "@tanstack/react-router";
import { toast } from "sonner";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Clock,
  Mail,
  ShieldOff,
  UserCircle,
} from "lucide-react";
import {
  useAdminUser,
  useDisableUser,
  useEnableUser,
} from "@/lib/api/hooks/admin";
import { useMyPermissions } from "@/lib/api/hooks/auth";

const STATUS_LABEL: Record<string, string> = {
  active: "Đang hoạt động",
  invited: "Đã mời",
  disabled: "Vô hiệu hoá",
  pending: "Chờ duyệt",
};

const STATUS_COLOR: Record<string, string> = {
  active: "bg-emerald-100 text-emerald-700",
  invited: "bg-amber-100 text-amber-700",
  disabled: "bg-red-100 text-red-700",
  pending: "bg-slate-100 text-slate-700",
};

function StatusBadge({ status }: { status: string }) {
  const cls = STATUS_COLOR[status] ?? "bg-slate-100 text-slate-700";
  const label = STATUS_LABEL[status] ?? status;
  return (
    <span
      className={`inline-block px-2 py-0.5 text-xs font-semibold rounded-md ${cls}`}
    >
      {label}
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

function ConfirmDisableDialog({
  onConfirm,
  onCancel,
  isPending,
}: {
  onConfirm: () => void;
  onCancel: () => void;
  isPending: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-surface-elev border border-border rounded-xl shadow-xl max-w-md w-full p-6">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
            <AlertTriangle className="h-5 w-5 text-red-600" />
          </div>
          <div className="flex-1">
            <h2 className="text-base font-headline font-bold text-text-strong">
              Vô hiệu hoá người dùng?
            </h2>
            <p className="text-sm text-text-muted mt-1">
              Tất cả phiên đăng nhập sẽ bị huỷ. Người dùng không thể đăng nhập
              cho đến khi được kích hoạt lại.
            </p>
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-5">
          <button
            type="button"
            onClick={onCancel}
            disabled={isPending}
            className="px-3 py-1.5 text-sm font-medium rounded-md text-text-strong border border-border hover:bg-surface-muted disabled:opacity-50"
          >
            Huỷ
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isPending}
            className="px-3 py-1.5 text-sm font-semibold rounded-md bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
          >
            {isPending ? "Đang xử lý..." : "Vô hiệu hoá"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminUserDetailPage() {
  const navigate = useNavigate();
  const params = useParams({ strict: false }) as { userId?: string };
  const userId = params.userId ?? "";

  const permissions = useMyPermissions();
  const canAdmin =
    permissions.data?.permissions.includes("system.administer") ?? false;

  const [confirmOpen, setConfirmOpen] = useState(false);

  useEffect(() => {
    if (permissions.isLoading) return;
    if (!canAdmin) {
      toast.error("Không có quyền truy cập");
      void navigate({ to: "/dashboard", replace: true });
    }
  }, [permissions.isLoading, canAdmin, navigate]);

  const enabled = !permissions.isLoading && canAdmin && Boolean(userId);
  const user = useAdminUser(enabled ? userId : "");
  const disable = useDisableUser(userId);
  const enable = useEnableUser(userId);

  if (permissions.isLoading || !canAdmin) {
    return (
      <div className="space-y-3 pb-12">
        <div className="h-6 w-40 bg-surface-muted animate-pulse rounded" />
        <div className="h-32 bg-surface-muted animate-pulse rounded-lg" />
      </div>
    );
  }

  const handleDisable = () => {
    setConfirmOpen(false);
    disable.mutate(undefined, {
      onSuccess: (out) =>
        toast.success(
          `Đã vô hiệu hoá. Đã thu hồi ${out.revoked_session_count} phiên.`,
        ),
      onError: (err) =>
        toast.error((err as Error).message || "Không thể vô hiệu hoá"),
    });
  };

  const handleEnable = () => {
    enable.mutate(undefined, {
      onSuccess: () => toast.success("Đã kích hoạt lại người dùng"),
      onError: (err) =>
        toast.error((err as Error).message || "Không thể kích hoạt"),
    });
  };

  const data = user.data;
  const displayName =
    data?.profile?.display_name?.trim() || data?.primary_email || "—";
  const isDisabled = data?.status === "disabled";

  return (
    <div className="space-y-6 pb-12">
      <Link
        to="/admin/users"
        className="inline-flex items-center gap-2 text-sm text-text-muted hover:text-text-strong"
      >
        <ArrowLeft className="h-4 w-4" />
        Quay lại danh sách
      </Link>

      {user.isError ? (
        <div className="bg-surface-elev border border-border rounded-lg p-5">
          <p className="text-sm text-danger">Không thể tải thông tin người dùng.</p>
        </div>
      ) : user.isLoading ? (
        <div className="space-y-3">
          <div className="h-32 bg-surface-muted animate-pulse rounded-lg" />
          <div className="h-24 bg-surface-muted animate-pulse rounded-lg" />
        </div>
      ) : data ? (
        <>
          <div className="bg-surface-elev border border-border rounded-xl p-6">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-full bg-m3-primary-fixed flex items-center justify-center shrink-0">
                <UserCircle className="h-7 w-7 text-m3-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-xl font-headline font-bold text-text-strong">
                    {displayName}
                  </h1>
                  <StatusBadge status={data.status} />
                </div>
                <p className="text-sm text-text-muted mt-1 flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5" />
                  {data.primary_email}
                </p>
                <p className="text-xs text-text-subtle mt-2 font-mono break-all">
                  {data.id}
                </p>
              </div>

              <div className="flex flex-col gap-2 shrink-0">
                {isDisabled ? (
                  <button
                    type="button"
                    onClick={handleEnable}
                    disabled={enable.isPending}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    {enable.isPending ? "Đang xử lý..." : "Kích hoạt"}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmOpen(true)}
                    disabled={disable.isPending}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
                  >
                    <ShieldOff className="h-3.5 w-3.5" />
                    Vô hiệu hoá
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-surface-elev border border-border rounded-lg p-4">
              <p className="text-xs font-semibold text-text-muted uppercase tracking-wide">
                Đăng nhập gần nhất
              </p>
              <p className="text-sm text-text-strong mt-1 flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-text-muted" />
                {formatDate(data.last_login_at)}
              </p>
            </div>
            <div className="bg-surface-elev border border-border rounded-lg p-4">
              <p className="text-xs font-semibold text-text-muted uppercase tracking-wide">
                Ngày tạo
              </p>
              <p className="text-sm text-text-strong mt-1">
                {formatDate(data.created_at)}
              </p>
            </div>
            <div className="bg-surface-elev border border-border rounded-lg p-4">
              <p className="text-xs font-semibold text-text-muted uppercase tracking-wide">
                Cập nhật gần nhất
              </p>
              <p className="text-sm text-text-strong mt-1">
                {formatDate(data.updated_at)}
              </p>
            </div>
          </div>

          {data.profile ? (
            <div className="bg-surface-elev border border-border rounded-lg p-5">
              <h2 className="text-sm font-headline font-bold text-text-strong mb-3">
                Hồ sơ
              </h2>
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
                <div>
                  <dt className="text-xs font-semibold text-text-muted">Tên hiển thị</dt>
                  <dd className="text-text-strong mt-0.5">
                    {data.profile.display_name || "—"}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold text-text-muted">Họ tên</dt>
                  <dd className="text-text-strong mt-0.5">
                    {[data.profile.given_name, data.profile.family_name]
                      .filter(Boolean)
                      .join(" ") || "—"}
                  </dd>
                </div>
                {data.profile.bio ? (
                  <div className="sm:col-span-2">
                    <dt className="text-xs font-semibold text-text-muted">Giới thiệu</dt>
                    <dd className="text-text-strong mt-0.5 whitespace-pre-wrap">
                      {data.profile.bio}
                    </dd>
                  </div>
                ) : null}
              </dl>
            </div>
          ) : null}
        </>
      ) : null}

      {confirmOpen ? (
        <ConfirmDisableDialog
          onConfirm={handleDisable}
          onCancel={() => setConfirmOpen(false)}
          isPending={disable.isPending}
        />
      ) : null}
    </div>
  );
}
