import { Link, useLocation } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { type NavItem, secondaryNavItems } from "@/lib/navigation";

interface SideNavBarProps {
  navItems: NavItem[];
  className?: string;
  collapsed?: boolean;
  onToggle?: () => void;
}

export default function SideNavBar({ navItems, className, collapsed = false, onToggle }: SideNavBarProps) {
  const location = useLocation();

  return (
    <aside
      className={cn(
        "flex flex-col py-6 h-screen bg-slate-50 fixed left-0 top-0 z-40 transition-all duration-300",
        "font-headline font-medium text-sm",
        collapsed ? "w-16" : "w-64",
        className
      )}
    >
      {/* Header */}
      <div
        className={cn(
          "mb-6 flex",
          collapsed ? "flex-col items-center gap-2 px-2" : "items-center justify-between px-4"
        )}
      >
        {collapsed ? (
          <Link to="/" className="text-base font-black text-m3-primary tracking-tighter font-headline">
            aB
          </Link>
        ) : (
          <Link to="/" className="flex flex-col">
            <span className="text-xl font-black text-m3-primary tracking-tighter font-headline">aBridgeAI</span>
            <span className="text-[10px] uppercase tracking-widest text-slate-500 mt-1">The Cognitive Conduit</span>
          </Link>
        )}
        {onToggle && (
          <button
            onClick={onToggle}
            className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-400 hover:text-slate-600 transition-colors"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>
        )}
      </div>

      {/* Nav Items */}
      <nav className="flex-1 flex flex-col gap-1 px-2 overflow-y-auto">
        {navItems.map((item) => {
          const isActive =
            location.pathname === item.href || location.pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              to={item.href}
              title={collapsed ? item.label : undefined}
              className={cn(
                "cursor-pointer flex items-center gap-3 py-3 mx-2 transition-all duration-200",
                collapsed ? "justify-center px-0 rounded-xl" : "px-4",
                isActive
                  ? collapsed
                    ? "text-violet-600 bg-violet-50 rounded-xl"
                    : "text-violet-600 bg-violet-50 border-r-2 border-violet-600 rounded-l-xl"
                  : collapsed
                    ? "text-slate-600 hover:text-indigo-600 hover:bg-indigo-50/50 rounded-xl"
                    : "text-slate-600 hover:text-indigo-600 hover:bg-indigo-50/50 hover:translate-x-1 rounded-xl"
              )}
            >
              <item.icon className="h-5 w-5 flex-shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Secondary Nav */}
      <div className={cn("flex flex-col gap-1 px-2 pt-4 border-t border-slate-100", !collapsed && "mx-2")}>
        {secondaryNavItems.map((item) => (
          <Link
            key={item.label}
            to={item.href}
            title={collapsed ? item.label : undefined}
            className={cn(
              "cursor-pointer flex items-center gap-3 py-3 transition-all duration-200 rounded-xl",
              collapsed ? "justify-center px-0 mx-0" : "px-4",
              item.label === "Log Out"
                ? "text-slate-500 hover:text-red-600 hover:bg-red-50"
                : "text-slate-500 hover:text-indigo-600 hover:bg-indigo-50/50"
            )}
          >
            <item.icon className="h-5 w-5 flex-shrink-0" />
            {!collapsed && <span>{item.label}</span>}
          </Link>
        ))}
      </div>
    </aside>
  );
}
