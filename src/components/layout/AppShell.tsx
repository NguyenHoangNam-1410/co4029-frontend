import { useEffect, useState } from "react";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/components/auth/AuthProvider";
import { clearAuthSession } from "@/lib/auth";
import SideNavBar from "./SideNavBar";
import ContentTopBar from "./ContentTopBar";
import { type NavItem } from "@/lib/navigation";

interface AppShellProps {
  children: React.ReactNode;
  navItems: NavItem[];
}

// If the auth check stalls (backend unreachable, network drop, etc.) we
// give up after this many ms and force the user back to /login instead of
// leaving them on the "Checking your session..." spinner forever.
const SESSION_CHECK_TIMEOUT_MS = 8_000;

export default function AppShell({ children, navItems }: AppShellProps) {
  const { status, logout } = useAuth();
  const [collapsed, setCollapsed] = useState(() => window.innerWidth < 768);
  const [stalled, setStalled] = useState(false);
  const navigate = useNavigate();
  const currentHref = useRouterState({ select: (s) => s.location.href });

  // When unauthenticated, bounce the user back to /login with a `next` param
  // so they can return to where they were after re-authenticating.
  useEffect(() => {
    if (status === "unauthenticated") {
      void navigate({
        to: "/login",
        search: { next: currentHref },
        replace: true,
      });
    }
  }, [status, navigate, currentHref]);

  // Safety net: if we stay in "loading" for too long, treat the session as
  // dead, wipe local credentials, and route to /login. This handles the case
  // where the backend never responds.
  useEffect(() => {
    if (status !== "loading") {
      setStalled(false);
      return;
    }

    const timer = window.setTimeout(() => {
      setStalled(true);
    }, SESSION_CHECK_TIMEOUT_MS);

    return () => window.clearTimeout(timer);
  }, [status]);

  useEffect(() => {
    if (!stalled) return;

    // logout() will hit the backend, which we already suspect is down. Clear
    // local state directly and fall back to logout in the background.
    clearAuthSession();
    void logout().catch(() => {
      /* ignore — local session is already cleared */
    });
    void navigate({
      to: "/login",
      search: { next: currentHref },
      replace: true,
    });
  }, [stalled, logout, navigate, currentHref]);

  if (status !== "authenticated") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-m3-surface px-6">
        <div className="flex items-center gap-3 rounded-xl bg-card px-5 py-4 text-sm font-semibold text-m3-on-surface shadow-editorial border border-border">
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
          <span>
            {status === "unauthenticated" || stalled
              ? "Redirecting to sign in..."
              : "Checking your session..."}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-m3-surface">
      <SideNavBar
        navItems={navItems}
        collapsed={collapsed}
        onToggle={() => setCollapsed((c) => !c)}
      />

      {/* Backdrop — mobile only, when sidebar expanded */}
      {!collapsed && (
        <div
          className="fixed inset-0 z-30 bg-black/20 md:hidden"
          onClick={() => setCollapsed(true)}
        />
      )}

      <main
        className={cn(
          "relative min-h-screen transition-all duration-300 bg-white",
          "ml-16",
          !collapsed && "md:ml-64"
        )}
      >
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgb(0_0_0/0.03)_1px,transparent_1px),linear-gradient(to_bottom,rgb(0_0_0/0.03)_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />
        <ContentTopBar />
        <div className="relative px-4 sm:px-6 lg:px-10 py-6">
          {children}
        </div>
      </main>
    </div>
  );
}
