import { useEffect } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { Mail, Search, Users } from "lucide-react";
import { useTranslation } from "react-i18next";
import { InfiniteList } from "@/components/ui/InfiniteList";
import { useUsersList } from "@/lib/api/hooks/admin";
import { useMyPermissions } from "@/lib/api/hooks/auth";
import type { User } from "@/lib/api/types";

function StatusBadge({ status }: { status: string }) {
  const { t } = useTranslation();
  const STATUS_COLOR: Record<string, string> = {
    active: "bg-emerald-100 text-emerald-700",
    invited: "bg-amber-100 text-amber-700",
    disabled: "bg-red-100 text-red-700",
    inactive: "bg-red-100 text-red-700",
    pending: "bg-slate-100 text-slate-700",
    suspended: "bg-red-100 text-red-700",
  };
  const cls = STATUS_COLOR[status] ?? "bg-slate-100 text-slate-700";
  const label = t(`admin.users.status.${status}`, { defaultValue: status });
  return (
    <span
      className={`inline-block px-2 py-0.5 text-[11px] font-semibold rounded-md ${cls}`}
    >
      {label}
    </span>
  );
}

function UserRow({ user }: { user: User }) {
  const displayName =
    user.profile?.display_name?.trim() || user.primary_email;

  return (
    <Link
      to="/admin/users/$userId"
      params={{ userId: user.id }}
      className="block bg-surface-elev border border-border rounded-lg p-4 mb-2 hover:border-border-strong hover:shadow-editorial transition-colors duration-150"
    >
      <div className="flex items-center gap-4">
        <div className="w-9 h-9 rounded-full bg-m3-primary-fixed flex items-center justify-center shrink-0">
          <Users className="h-4 w-4 text-m3-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-text-strong truncate">
            {displayName}
          </p>
          <p className="text-xs text-text-muted flex items-center gap-1.5 mt-0.5">
            <Mail className="h-3 w-3" />
            <span className="truncate">{user.primary_email}</span>
          </p>
        </div>
        <StatusBadge status={user.status} />
      </div>
    </Link>
  );
}

export default function AdminUsersPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const permissions = useMyPermissions();
  const canAdmin =
    permissions.data?.permissions.includes("system.administer") ?? false;

  useEffect(() => {
    if (permissions.isLoading) return;
    if (!canAdmin) {
      toast.error(t("admin.users.roles.errors.no_permission"));
      void navigate({ to: "/dashboard", replace: true });
    }
  }, [permissions.isLoading, canAdmin, navigate, t]);

  const enabled = !permissions.isLoading && canAdmin;
  const list = useUsersList(20);

  if (permissions.isLoading) {
    return (
      <div className="space-y-3 pb-12">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-16 bg-surface-muted animate-pulse rounded-lg"
          />
        ))}
      </div>
    );
  }

  if (!canAdmin) {
    return null;
  }

  return (
    <div className="space-y-6 pb-12">
      <div>
        <h1 className="text-2xl font-headline font-bold text-text-strong">
          {t("admin.users.list_title")}
        </h1>
        <p className="text-sm text-text-muted mt-1">
          {t("admin.users.list_subtitle", {
            defaultValue: "List of users within your permission scope.",
          })}
        </p>
      </div>

      {!enabled || list.isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="h-16 bg-surface-muted animate-pulse rounded-lg"
            />
          ))}
        </div>
      ) : list.isError ? (
        <div className="bg-surface-elev border border-border rounded-lg p-5">
          <p className="text-sm text-danger">
            {t("admin.users.roles.errors.load_failed")}
          </p>
        </div>
      ) : (
        <InfiniteList<User>
          items={list.items}
          hasNextPage={list.hasNextPage}
          fetchNextPage={list.fetchNextPage}
          isFetchingNextPage={list.isFetchingNextPage}
          renderItem={(user) => <UserRow user={user} />}
          keyOf={(user) => user.id}
          empty={
            <div className="bg-surface-elev border border-border rounded-lg p-10 text-center">
              <Search className="h-10 w-10 mx-auto mb-3 text-text-subtle" />
              <p className="text-sm font-medium text-text-strong">
                {t("admin.users.empty_title", {
                  defaultValue: "No users yet",
                })}
              </p>
              <p className="text-xs text-text-muted mt-1">
                {t("admin.users.empty_body", {
                  defaultValue:
                    "When users are registered, they will appear here.",
                })}
              </p>
            </div>
          }
        />
      )}
    </div>
  );
}
