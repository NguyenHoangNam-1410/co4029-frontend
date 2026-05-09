import { useLocation, Outlet } from "@tanstack/react-router";
import AppShell from "@/components/layout/AppShell";
import { studentNavItems, teacherNavItems } from "@/lib/navigation";

export default function AuthenticatedLayout() {
  const location = useLocation();
  const isTeacher = location.pathname.startsWith("/teacher");
  const navItems = isTeacher ? teacherNavItems : studentNavItems;

  return (
    <AppShell navItems={navItems}>
      <Outlet />
    </AppShell>
  );
}
