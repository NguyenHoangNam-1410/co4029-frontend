import { Outlet } from "@tanstack/react-router";
import AppShell from "@/components/layout/AppShell";
import { studentNavItems } from "@/lib/navigation";

export default function AuthenticatedLayout() {
  return (
    <AppShell navItems={studentNavItems}>
      <Outlet />
    </AppShell>
  );
}
