import { useLocation, Outlet } from "@tanstack/react-router";
import AppShell from "@/components/layout/AppShell";
import { DesktopOnlyBanner } from "@/components/ui/desktop-only-banner";
import { studentNavItems, teacherNavItems } from "@/lib/navigation";

const DESKTOP_FIRST_PREFIXES = [
  "/admin",
  "/teacher",
  "/dept",
  "/management",
];

export default function AuthenticatedLayout() {
  const location = useLocation();
  const isTeacher = location.pathname.startsWith("/teacher");
  const navItems = isTeacher ? teacherNavItems : studentNavItems;
  const showDesktopBanner = DESKTOP_FIRST_PREFIXES.some((p) =>
    location.pathname.startsWith(p),
  );

  return (
    <AppShell navItems={navItems}>
      {showDesktopBanner ? <DesktopOnlyBanner /> : null}
      <Outlet />
    </AppShell>
  );
}
