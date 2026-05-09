import { Link, useLocation } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import { type NavItem, secondaryNavItems } from "@/lib/navigation";

interface SideNavBarProps {
  navItems: NavItem[];
  className?: string;
}

export default function SideNavBar({ navItems, className }: SideNavBarProps) {
  const location = useLocation();

  return (
    <aside
      className={cn(
        "hidden lg:flex flex-col gap-2 py-6 h-screen w-64 bg-slate-50 fixed left-0 top-0",
        "font-headline font-medium text-sm",
        className
      )}
    >
      <div className="px-4 mb-6">
        <Link to="/" className="text-xl font-black text-m3-primary tracking-tighter font-headline">
          aBridgeAI
        </Link>
        <p className="text-[10px] uppercase tracking-widest text-slate-500 mt-1">The Cognitive Conduit</p>
      </div>

      <nav className="flex-1 flex flex-col gap-2 px-2 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = location.pathname === item.href || location.pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              to={item.href}
              className={cn(
                "cursor-pointer flex items-center gap-3 px-4 py-3 mx-2 transition-all duration-200",
                isActive
                  ? "text-violet-600 bg-violet-50 border-r-2 border-violet-600 rounded-l-xl"
                  : "text-slate-600 hover:text-indigo-600 hover:bg-indigo-50/50 hover:translate-x-1 rounded-xl"
              )}
            >
              <item.icon className="h-5 w-5 flex-shrink-0" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="flex flex-col gap-2 px-2 pt-4 border-t border-slate-100 mx-4">
        {secondaryNavItems.map((item) => (
          <Link
            key={item.label}
            to={item.href}
            className={cn(
              "cursor-pointer flex items-center gap-3 px-4 py-3 transition-all duration-200 rounded-xl",
              item.label === "Log Out"
                ? "text-slate-500 hover:text-red-600 hover:bg-red-50"
                : "text-slate-500 hover:text-indigo-600 hover:bg-indigo-50/50"
            )}
          >
            <item.icon className="h-5 w-5 flex-shrink-0" />
            <span>{item.label}</span>
          </Link>
        ))}
      </div>
    </aside>
  );
}
