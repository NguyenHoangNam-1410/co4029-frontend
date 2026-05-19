import { useLocation, Outlet } from "@tanstack/react-router";
import AppShell from "@/components/layout/AppShell";
import { DesktopOnlyBanner } from "@/components/ui/desktop-only-banner";
import {
  adminNavItems,
  studentNavItems,
  teacherNavItems,
} from "@/lib/navigation";

const DESKTOP_FIRST_PREFIXES = [
  "/admin",
  "/teacher",
  "/dept",
  "/management",
];

export default function AuthenticatedLayout() {
  const location = useLocation();

  const onAdminPath = location.pathname.startsWith("/admin");
  const onTeacherPath =
    location.pathname.startsWith("/teacher") ||
    location.pathname.startsWith("/dept") ||
    location.pathname.startsWith("/management");

  const navItems = onAdminPath
    ? adminNavItems
    : onTeacherPath
      ? teacherNavItems
      : studentNavItems;

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
