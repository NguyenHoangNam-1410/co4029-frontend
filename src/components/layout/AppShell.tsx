import { useState } from "react";
import { Loader2, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/components/auth/AuthProvider";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import SideNavBar from "./SideNavBar";
import BottomNavBar from "./BottomNavBar";
import ContentTopBar from "./ContentTopBar";
import {
  adminBottomNavItems,
  adminNavItems,
  bottomNavItems,
  instructorBottomNavItems,
  instructorNavItems,
  type NavItem,
} from "@/lib/navigation";

interface AppShellProps {
  children: React.ReactNode;
  navItems: NavItem[];
}

export default function AppShell({ children, navItems }: AppShellProps) {
  const { status } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const mobileNavItems =
    navItems === adminNavItems
      ? adminBottomNavItems
      : navItems === instructorNavItems
        ? instructorBottomNavItems
        : bottomNavItems;

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
      {/* Desktop Sidebar */}
      <SideNavBar navItems={navItems} />

      {/* Mobile Sidebar (Sheet) */}
      <div className="md:hidden">
        <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
          <SheetTrigger
            render={
              <Button
                variant="ghost"
                size="icon"
                className="fixed top-3 left-3 z-50"
              />
            }
          >
            <Menu className="h-5 w-5" />
          </SheetTrigger>
          <SheetContent side="left" className="p-0 w-64" showCloseButton={false}>
            <SideNavBar navItems={navItems} className="relative w-full h-full" />
          </SheetContent>
        </Sheet>
      </div>

      {/* Main Content */}
      <main className="lg:ml-64 min-h-screen">
        <ContentTopBar />
        {children}
      </main>

      {/* Mobile Bottom Nav */}
      <BottomNavBar navItems={mobileNavItems} />
    </div>
  );
}
