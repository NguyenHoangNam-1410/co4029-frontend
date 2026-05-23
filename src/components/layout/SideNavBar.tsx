import { useState } from "react";
import { Link, useLocation } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight, Loader2, LogOut } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { type NavItem, secondaryNavItems } from "@/lib/navigation";
import { useAuth } from "@/components/auth/AuthProvider";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

interface SideNavBarProps {
  navItems: NavItem[];
  className?: string;
  collapsed?: boolean;
  onToggle?: () => void;
}

export default function SideNavBar({ navItems, className, collapsed = false, onToggle }: SideNavBarProps) {
  const location = useLocation();
  const { t } = useTranslation();
  const { logout } = useAuth();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const labelOf = (item: NavItem) =>
    item.i18nKey ? t(item.i18nKey, { defaultValue: item.label }) : item.label;

  // The Logout entry in `secondaryNavItems` is identified by stable label.
  // Render it as a button (not a Link) so the click can open the confirm dialog.
  // Keep all other secondary entries as Links to preserve current behavior.
  const isLogoutItem = (item: NavItem) => item.label === "Log Out";

  async function handleConfirmLogout() {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    try {
      await logout();
    } finally {
      // logout() ultimately replaces the page; if it doesn't (network error),
      // still surface the redirect so the user isn't stranded on the dialog.
      window.location.replace("/login");
    }
  }

  return (
    <>
      <aside
        className={cn(
          "flex flex-col py-6 h-screen bg-surface-elev border-r border-border fixed left-0 top-0 z-40 transition-all duration-300",
          "font-heading font-medium text-sm",
          collapsed ? "w-16" : "w-64",
          className
        )}
      >
        <div
          className={cn(
            "mb-6 flex",
            collapsed ? "flex-col items-center gap-2 px-2" : "items-center justify-between px-4"
          )}
        >
          {collapsed ? (
            <Link to="/" className="text-base font-bold text-primary tracking-tight font-heading cursor-pointer">
              aB
            </Link>
          ) : (
            <Link to="/" className="flex flex-col cursor-pointer">
              <span className="text-xl font-bold text-primary tracking-tight font-heading">aBridgeAI</span>
              <span className="text-[10px] uppercase tracking-widest text-text-subtle mt-1">The Cognitive Conduit</span>
            </Link>
          )}
          {onToggle && (
            <button
              onClick={onToggle}
              className="cursor-pointer p-1.5 rounded-md hover:bg-surface-muted text-text-subtle hover:text-text-strong transition-colors"
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </button>
          )}
        </div>

        <nav className="flex-1 flex flex-col gap-1 px-2 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = item.exact
              ? location.pathname === item.href
              : location.pathname === item.href || location.pathname.startsWith(item.href + "/");
            const label = labelOf(item);
            return (
              <Link
                key={item.href}
                to={item.href}
                title={collapsed ? label : undefined}
                className={cn(
                  "cursor-pointer flex items-center gap-3 py-2.5 mx-2 rounded-md transition-colors duration-150",
                  collapsed ? "justify-center px-0" : "px-4",
                  isActive
                    ? collapsed
                      ? "text-primary bg-primary-soft"
                      : "text-primary bg-primary-soft border-r-2 border-primary"
                    : "text-text-muted hover:text-primary hover:bg-surface-muted"
                )}
              >
                <item.icon className="h-5 w-5 flex-shrink-0" />
                {!collapsed && <span>{label}</span>}
              </Link>
            );
          })}
        </nav>

        <div className={cn("flex flex-col gap-1 px-2 pt-4 border-t border-border", !collapsed && "mx-2")}>
          {secondaryNavItems.map((item) => {
            const label = labelOf(item);
            const baseClasses = cn(
              "cursor-pointer flex items-center gap-3 py-2.5 transition-colors duration-150 rounded-md",
              collapsed ? "justify-center px-0 mx-0" : "px-4",
              isLogoutItem(item)
                ? "text-text-subtle hover:text-danger hover:bg-danger/10"
                : "text-text-subtle hover:text-primary hover:bg-surface-muted"
            );

            if (isLogoutItem(item)) {
              return (
                <button
                  key={item.label}
                  type="button"
                  title={collapsed ? label : undefined}
                  onClick={() => setConfirmOpen(true)}
                  disabled={isLoggingOut}
                  className={cn(
                    baseClasses,
                    "w-full text-left bg-transparent border-0 disabled:opacity-60 disabled:cursor-not-allowed",
                  )}
                >
                  {isLoggingOut ? (
                    <Loader2 className="h-5 w-5 flex-shrink-0 animate-spin" />
                  ) : (
                    <LogOut className="h-5 w-5 flex-shrink-0" />
                  )}
                  {!collapsed && <span>{label}</span>}
                </button>
              );
            }

            return (
              <Link
                key={item.label}
                to={item.href}
                title={collapsed ? label : undefined}
                className={baseClasses}
              >
                <item.icon className="h-5 w-5 flex-shrink-0" />
                {!collapsed && <span>{label}</span>}
              </Link>
            );
          })}
        </div>
      </aside>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={(next) => {
          // Block closing while the logout request is in flight.
          if (isLoggingOut && !next) return;
          setConfirmOpen(next);
        }}
        title={t("logout_confirm.title")}
        description={t("logout_confirm.description")}
        confirmLabel={
          isLoggingOut ? (
            <span className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              {t("logout_confirm.confirming")}
            </span>
          ) : (
            t("logout_confirm.confirm")
          )
        }
        cancelLabel={t("logout_confirm.cancel")}
        confirmVariant="destructive"
        isPending={isLoggingOut}
        onConfirm={() => void handleConfirmLogout()}
      />
    </>
  );
}
