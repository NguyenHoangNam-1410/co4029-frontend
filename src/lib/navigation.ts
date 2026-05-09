import {
  LayoutDashboard,
  BookOpen,
  BarChart3,
  GraduationCap,
  Users,
  Settings,
  HelpCircle,
  LogOut,
  Home,
  Shield,
  MessageSquare,
  FileText,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  exact?: boolean;
}

export const studentNavItems: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Courses", href: "/courses", icon: BookOpen },
  { label: "Progress", href: "/progress", icon: BarChart3 },
];

export const teacherNavItems: NavItem[] = [
  { label: "Overview", href: "/teacher", icon: LayoutDashboard, exact: true },
  { label: "My Courses", href: "/teacher/courses", icon: BookOpen },
];

export const instructorNavItems: NavItem[] = [
  { label: "Dashboard", href: "/instructor-dashboard", icon: LayoutDashboard },
  { label: "My Courses", href: "/my-courses", icon: BookOpen },
];

export const adminNavItems: NavItem[] = [
  { label: "Dashboard", href: "/admin-dashboard", icon: LayoutDashboard },
  { label: "Courses", href: "/admin-courses", icon: BookOpen },
  { label: "Users", href: "/admin-users", icon: Users },
  { label: "Analytics", href: "/admin-analytics", icon: BarChart3 },
  { label: "Settings", href: "/admin-settings", icon: Settings },
  { label: "Audit Log", href: "/admin-audit", icon: FileText },
];

export const settingsNavItems: NavItem[] = [
  { label: "Profile", href: "/settings", icon: Settings },
  { label: "Security", href: "/settings/security", icon: Shield },
  { label: "Notifications", href: "/settings/notifications", icon: MessageSquare },
];

export const bottomNavItems: NavItem[] = [
  { label: "Home", href: "/dashboard", icon: Home },
  { label: "Courses", href: "/courses", icon: BookOpen },
  { label: "Profile", href: "/settings", icon: Settings },
];

export const instructorBottomNavItems: NavItem[] = [
  { label: "Dashboard", href: "/instructor-dashboard", icon: LayoutDashboard },
  { label: "Courses", href: "/my-courses", icon: BookOpen },
  { label: "Students", href: "/students", icon: Users },
];

export const adminBottomNavItems: NavItem[] = [
  { label: "Dashboard", href: "/admin-dashboard", icon: LayoutDashboard },
  { label: "Courses", href: "/admin-courses", icon: BookOpen },
  { label: "Users", href: "/admin-users", icon: Users },
  { label: "Settings", href: "/admin-settings", icon: Settings },
];

export const secondaryNavItems: NavItem[] = [
  { label: "Help", href: "#", icon: HelpCircle },
  { label: "Log Out", href: "#", icon: LogOut },
];

export const topNavLinks = [
  { label: "Explore", href: "/courses" },
  { label: "Dashboard", href: "/dashboard" },
];
