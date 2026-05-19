import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "@tanstack/react-router";
import { toast } from "sonner";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Clock,
  Mail,
  Plus,
  ShieldOff,
  Trash2,
  UserCircle,
} from "lucide-react";
import {
  useAdminUser,
  useDisableUser,
  useEnableUser,
  useGrantUserAssignment,
  useListRoles,
  useRevokeUserAssignment,
} from "@/lib/api/hooks/admin";
import { useMyPermissions } from "@/lib/api/hooks/auth";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { Skeleton } from "@/components/ui/skeleton";
import type { RoleAssignmentRead } from "@/lib/api/types";

const STATUS_LABEL: Record<string, string> = {
  active: "Đang hoạt động",
  invited: "Đã mời",
  disabled: "Vô hiệu hoá",
  inactive: "Vô hiệu hoá",
  pending: "Chờ duyệt",
  suspended: "Tạm khoá",
};

const STATUS_COLOR: Record<string, string> = {
  active: "bg-emerald-100 text-emerald-700",
  invited: "bg-amber-100 text-amber-700",
  disabled: "bg-red-100 text-red-700",
  inactive: "bg-red-100 text-red-700",
  pending: "bg-slate-100 text-slate-700",
  suspended: "bg-red-100 text-red-700",
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

function RoleAssignmentsSection({
  userId,
  assignments,
}: {
  userId: string;
  assignments: RoleAssignmentRead[];
}) {
  const roles = useListRoles();
  const grant = useGrantUserAssignment(userId);
  const revoke = useRevokeUserAssignment(userId);

  const [roleCode, setRoleCode] = useState<string>("");
  const [scopeKind, setScopeKind] = useState<string>("organization");
  const [organizationId, setOrganizationId] = useState<string>("");
  const [orgUnitId, setOrgUnitId] = useState<string>("");
  const [courseId, setCourseId] = useState<string>("");

  const roleOptions = useMemo(
    () => (roles.data ?? []).map((r) => r.role),
    [roles.data],
  );
  const roleByCode = useMemo(() => {
    const m: Record<string, string> = {};
    for (const r of roleOptions) m[r.id] = r.code;
    return m;
  }, [roleOptions]);

  const handleGrant = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!roleCode) {
      toast.error("Hãy chọn vai trò");
      return;
    }
    if (scopeKind === "organization" && !organizationId.trim()) {
      toast.error("Cần ID tổ chức cho phạm vi 'organization'");
      return;
    }
    if (scopeKind === "org_unit" && !orgUnitId.trim()) {
      toast.error("Cần ID đơn vị cho phạm vi 'org_unit'");
      return;
    }
    if (scopeKind === "course" && !courseId.trim()) {
      toast.error("Cần ID khoá học cho phạm vi 'course'");
      return;
    }
    grant.mutate(
      {
        role_code: roleCode,
        scope_kind: scopeKind as "global" | "organization" | "org_unit" | "course",
        organization_id: organizationId.trim() || null,
        org_unit_id: orgUnitId.trim() || null,
        course_id: courseId.trim() || null,
        active_until: null,
      },
      {
        onSuccess: () => {
          toast.success(`Đã gán vai trò ${roleCode}`);
          setRoleCode("");
          setOrganizationId("");
          setOrgUnitId("");
          setCourseId("");
        },
        onError: (err) =>
          toast.error((err as Error).message || "Không thể gán vai trò"),
      },
    );
  };

  return (
    <div className="bg-surface-elev border border-border rounded-lg p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-headline font-bold text-text-strong">
          Vai trò &amp; phân quyền
        </h2>
        <span className="text-xs text-text-muted">
          {assignments.length} vai trò
        </span>
      </div>

      {assignments.length === 0 ? (
        <p className="text-sm text-text-muted py-4 text-center">
          Người dùng chưa được gán vai trò nào.
        </p>
      ) : (
        <ul className="divide-y divide-border">
          {assignments.map((a) => {
            const roleName =
              roleOptions.find((r) => r.id === a.role_id)?.name ??
              roleByCode[a.role_id] ??
              a.role_id;
            return (
              <li key={a.id} className="py-3 flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-text-strong">
                    {roleName}
                  </p>
                  <p className="text-xs text-text-muted mt-0.5 font-mono break-all">
                    Phạm vi: {a.scope_kind}
                    {a.organization_id ? ` · org=${a.organization_id}` : ""}
                    {a.org_unit_id ? ` · unit=${a.org_unit_id}` : ""}
                    {a.course_id ? ` · course=${a.course_id}` : ""}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (
                      window.confirm(
                        `Thu hồi vai trò "${roleName}" cho người dùng này?`,
                      )
                    ) {
                      revoke.mutate(a.id, {
                        onSuccess: () => toast.success("Đã thu hồi vai trò"),
                        onError: (err) =>
                          toast.error(
                            (err as Error).message || "Không thể thu hồi",
                          ),
                      });
                    }
                  }}
                  disabled={revoke.isPending}
                  className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-md text-red-700 hover:bg-red-50 disabled:opacity-50"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Thu hồi
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <form
        onSubmit={handleGrant}
        className="mt-4 pt-4 border-t border-border space-y-3"
      >
        <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wide">
          Gán vai trò mới
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="text-xs text-text-muted">
            Vai trò
            <select
              value={roleCode}
              onChange={(e) => setRoleCode(e.target.value)}
              className="mt-1 block w-full rounded-md border border-border bg-surface-elev px-2 py-1.5 text-sm"
              required
            >
              <option value="">— Chọn vai trò —</option>
              {roleOptions.map((r) => (
                <option key={r.id} value={r.code}>
                  {r.name} ({r.code})
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs text-text-muted">
            Phạm vi
            <select
              value={scopeKind}
              onChange={(e) => setScopeKind(e.target.value)}
              className="mt-1 block w-full rounded-md border border-border bg-surface-elev px-2 py-1.5 text-sm"
            >
              <option value="organization">Tổ chức</option>
              <option value="org_unit">Đơn vị</option>
              <option value="course">Khoá học</option>
              <option value="global">Toàn cục</option>
            </select>
          </label>
          {scopeKind === "organization" || scopeKind === "org_unit" ? (
            <label className="text-xs text-text-muted">
              ID tổ chức
              <input
                type="text"
                value={organizationId}
                onChange={(e) => setOrganizationId(e.target.value)}
                placeholder="00000000-0000-0000-0000-00000000a001"
                className="mt-1 block w-full rounded-md border border-border bg-surface-elev px-2 py-1.5 text-sm font-mono"
                required={scopeKind === "organization"}
              />
            </label>
          ) : null}
          {scopeKind === "org_unit" ? (
            <label className="text-xs text-text-muted">
              ID đơn vị
              <input
                type="text"
                value={orgUnitId}
                onChange={(e) => setOrgUnitId(e.target.value)}
                className="mt-1 block w-full rounded-md border border-border bg-surface-elev px-2 py-1.5 text-sm font-mono"
                required
              />
            </label>
          ) : null}
          {scopeKind === "course" ? (
            <label className="text-xs text-text-muted">
              ID khoá học
              <input
                type="text"
                value={courseId}
                onChange={(e) => setCourseId(e.target.value)}
                className="mt-1 block w-full rounded-md border border-border bg-surface-elev px-2 py-1.5 text-sm font-mono"
                required
              />
            </label>
          ) : null}
        </div>
        <button
          type="submit"
          disabled={grant.isPending}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md bg-m3-primary text-white hover:bg-m3-primary/90 disabled:opacity-50"
        >
          <Plus className="h-3.5 w-3.5" />
          {grant.isPending ? "Đang gán..." : "Gán vai trò"}
        </button>
      </form>
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
  const detail = useAdminUser(enabled ? userId : "");
  const disable = useDisableUser(userId);
  const enable = useEnableUser(userId);

  if (permissions.isLoading || !canAdmin) {
    return (
      <div className="space-y-3 pb-12">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-32 rounded-lg" />
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

  const data = detail.data;
  const user = data?.user;
  const displayName =
    user?.profile?.display_name?.trim() || user?.primary_email || "—";
  const isDisabled = user?.status === "disabled" || user?.status === "inactive";

  return (
    <div className="space-y-6 pb-12">
      <Breadcrumbs
        items={[
          { label: "Quản trị", to: "/admin/stats" },
          { label: "Người dùng", to: "/admin/users" },
          { label: displayName },
        ]}
      />
      <Link
        to="/admin/users"
        className="inline-flex items-center gap-2 text-sm text-text-muted hover:text-text-strong"
      >
        <ArrowLeft className="h-4 w-4" />
        Quay lại danh sách
      </Link>

      {detail.isError ? (
        <div className="bg-surface-elev border border-border rounded-lg p-5">
          <p className="text-sm text-danger">
            Không thể tải thông tin người dùng.
          </p>
        </div>
      ) : detail.isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-32 rounded-lg" />
          <Skeleton className="h-24 rounded-lg" />
        </div>
      ) : user && data ? (
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
                  <StatusBadge status={user.status} />
                </div>
                <p className="text-sm text-text-muted mt-1 flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5" />
                  {user.primary_email}
                </p>
                <p className="text-xs text-text-subtle mt-2 font-mono break-all">
                  {user.id}
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
                {formatDate(user.last_login_at)}
              </p>
            </div>
            <div className="bg-surface-elev border border-border rounded-lg p-4">
              <p className="text-xs font-semibold text-text-muted uppercase tracking-wide">
                Ngày tạo
              </p>
              <p className="text-sm text-text-strong mt-1">
                {formatDate(user.created_at)}
              </p>
            </div>
            <div className="bg-surface-elev border border-border rounded-lg p-4">
              <p className="text-xs font-semibold text-text-muted uppercase tracking-wide">
                Cập nhật gần nhất
              </p>
              <p className="text-sm text-text-strong mt-1">
                {formatDate(user.updated_at)}
              </p>
            </div>
          </div>

          {user.profile ? (
            <div className="bg-surface-elev border border-border rounded-lg p-5">
              <h2 className="text-sm font-headline font-bold text-text-strong mb-3">
                Hồ sơ
              </h2>
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
                <div>
                  <dt className="text-xs font-semibold text-text-muted">
                    Tên hiển thị
                  </dt>
                  <dd className="text-text-strong mt-0.5">
                    {user.profile.display_name || "—"}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold text-text-muted">
                    Họ tên
                  </dt>
                  <dd className="text-text-strong mt-0.5">
                    {[user.profile.given_name, user.profile.family_name]
                      .filter(Boolean)
                      .join(" ") || "—"}
                  </dd>
                </div>
                {user.profile.bio ? (
                  <div className="sm:col-span-2">
                    <dt className="text-xs font-semibold text-text-muted">
                      Giới thiệu
                    </dt>
                    <dd className="text-text-strong mt-0.5 whitespace-pre-wrap">
                      {user.profile.bio}
                    </dd>
                  </div>
                ) : null}
              </dl>
            </div>
          ) : null}

          <RoleAssignmentsSection
            userId={user.id}
            assignments={data.role_assignments}
          />

          {data.active_sessions.length > 0 ? (
            <div className="bg-surface-elev border border-border rounded-lg p-5">
              <h2 className="text-sm font-headline font-bold text-text-strong mb-3">
                Phiên đăng nhập đang hoạt động ({data.active_sessions.length})
              </h2>
              <ul className="divide-y divide-border">
                {data.active_sessions.map((s) => (
                  <li key={s.id} className="py-2 text-xs text-text-muted">
                    <span className="font-mono">{s.id}</span> — IP{" "}
                    {s.ip_address ?? "—"} · hết hạn{" "}
                    {formatDate(s.expires_at)}
                  </li>
                ))}
              </ul>
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
