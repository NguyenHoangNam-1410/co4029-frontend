import { Link, useLocation } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import { bottomNavItems, type NavItem } from "@/lib/navigation";

interface BottomNavBarProps {
  navItems?: NavItem[];
}

export default function BottomNavBar({ navItems = bottomNavItems }: BottomNavBarProps) {
  const location = useLocation();

  return (
    <nav className="md:hidden fixed bottom-0 left-0 w-full flex justify-around items-center px-4 pb-6 pt-2 bg-white/90 backdrop-blur-lg z-50 rounded-t-3xl shadow-[0_-10px_40px_rgba(58,56,139,0.08)] border-t border-slate-100">
      {navItems.map((item) => {
        const isActive = location.pathname === item.href || location.pathname.startsWith(item.href + "/");
        return (
          <Link
            key={item.href}
            to={item.href}
            className={cn(
              "flex flex-col items-center justify-center transition-all",
              isActive
                ? "bg-gradient-to-br from-indigo-600 to-purple-600 text-white rounded-2xl p-3 mb-2 scale-110 shadow-lg shadow-indigo-200"
                : "text-slate-500"
            )}
          >
            <item.icon className="h-5 w-5" />
            <span className={cn("text-[10px] font-bold mt-1", isActive ? "text-white" : "")}>
              {item.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
