import { useState } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/components/auth/AuthProvider";
import SideNavBar from "./SideNavBar";
import ContentTopBar from "./ContentTopBar";
import { type NavItem } from "@/lib/navigation";

interface AppShellProps {
  children: React.ReactNode;
  navItems: NavItem[];
}

export default function AppShell({ children, navItems }: AppShellProps) {
  const { status } = useAuth();
  const [collapsed, setCollapsed] = useState(() => window.innerWidth < 768);

  if (status !== "authenticated") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-m3-surface px-6">
        <div className="flex items-center gap-3 rounded-2xl bg-white/80 px-5 py-4 text-sm font-semibold text-m3-on-surface shadow-[0_24px_80px_rgba(25,28,30,0.08)] ring-1 ring-m3-outline-variant/20 backdrop-blur">
          <Loader2 className="h-4 w-4 animate-spin text-m3-secondary" />
          <span>Checking your session...</span>
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
          "min-h-screen transition-all duration-300",
          "ml-16",
          !collapsed && "md:ml-64"
        )}
      >
        <ContentTopBar />
        {children}
      </main>
    </div>
  );
}
