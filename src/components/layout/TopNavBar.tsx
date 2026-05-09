import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Bell, Loader2, Settings, User, LogOut } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getAuthDisplayName, getAuthUserInitials } from "@/lib/auth";
import { topNavLinks } from "@/lib/navigation";
import { cn } from "@/lib/utils";

export default function TopNavBar() {
  const { isAuthenticated, logout, status, user } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const displayName = getAuthDisplayName(user);

  async function handleLogout() {
    setIsLoggingOut(true);

    try {
      await logout();
      void navigate({ to: "/login", search: { next: undefined }, replace: true });
    } finally {
      setIsLoggingOut(false);
    }
  }

  return (
    <nav className="fixed top-0 w-full z-50 bg-white/70 backdrop-blur-xl shadow-[0px_20px_40px_rgba(25,28,30,0.06)]">
      <div className="flex items-center justify-between px-8 h-16 w-full max-w-7xl mx-auto">
        <div className="flex items-center gap-8">
          <Link to="/" className="text-2xl font-bold tracking-tighter text-m3-primary font-headline">
            aBridgeAI
          </Link>
          <div className="hidden md:flex gap-6 items-center">
            {topNavLinks.map((link) => (
              <Link
                key={link.href}
                to={link.href}
                className={cn(
                  "font-headline tracking-tight text-sm font-semibold transition-colors",
                  location.pathname === link.href
                    ? "text-m3-secondary border-b-2 border-m3-secondary pb-1"
                    : "text-m3-on-surface-variant hover:text-m3-primary"
                )}
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-4">
          {status === "loading" ? (
            <div className="h-10 w-28 rounded-full bg-m3-primary-fixed/60 animate-pulse" />
          ) : isAuthenticated ? (
            <>
              <button
                className="relative text-m3-on-surface-variant cursor-pointer hover:bg-m3-primary-fixed p-2.5 rounded-full transition-colors"
                aria-label="Notifications"
              >
                <Bell className="h-5 w-5" />
                <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-m3-secondary ring-2 ring-white" />
              </button>

              <DropdownMenu>
                <DropdownMenuTrigger
                  className="cursor-pointer rounded-full outline-none focus-visible:ring-2 focus-visible:ring-m3-secondary focus-visible:ring-offset-2 transition-all hover:opacity-90"
                  aria-label="User menu"
                >
                  <Avatar className="h-9 w-9 ring-2 ring-white shadow-sm">
                    <AvatarFallback className="bg-m3-primary text-white text-xs font-bold">
                      {getAuthUserInitials(user)}
                    </AvatarFallback>
                  </Avatar>
                </DropdownMenuTrigger>

                <DropdownMenuContent
                  align="end"
                  sideOffset={8}
                  className="w-56 rounded-xl bg-m3-surface-container-lowest shadow-editorial border border-m3-outline-variant/15 p-1.5"
                >
                  <div className="px-3 py-2.5">
                    <p className="text-sm font-semibold text-m3-on-surface truncate">{displayName}</p>
                    <p className="text-xs text-m3-on-surface-variant truncate mt-0.5">
                      {user?.primary_email}
                    </p>
                  </div>

                  <DropdownMenuSeparator className="bg-m3-outline-variant/15" />

                  <DropdownMenuGroup>
                    <DropdownMenuItem className="rounded-lg px-3 py-2 gap-3 cursor-pointer text-m3-on-surface hover:bg-m3-primary-fixed focus:bg-m3-primary-fixed focus:text-m3-primary">
                      <Link to="/dashboard" className="flex items-center gap-3 w-full">
                        <User className="h-4 w-4 text-m3-on-surface-variant" />
                        <span className="text-sm font-medium">Dashboard</span>
                      </Link>
                    </DropdownMenuItem>

                    <DropdownMenuItem className="rounded-lg px-3 py-2 gap-3 cursor-pointer text-m3-on-surface hover:bg-m3-primary-fixed focus:bg-m3-primary-fixed focus:text-m3-primary">
                      <Link to="/settings" className="flex items-center gap-3 w-full">
                        <Settings className="h-4 w-4 text-m3-on-surface-variant" />
                        <span className="text-sm font-medium">Settings</span>
                      </Link>
                    </DropdownMenuItem>
                  </DropdownMenuGroup>

                  <DropdownMenuSeparator className="bg-m3-outline-variant/15" />

                  <DropdownMenuItem
                    variant="destructive"
                    className="rounded-lg px-3 py-2 gap-3 cursor-pointer"
                    disabled={isLoggingOut}
                    onSelect={(event) => {
                      event.preventDefault();
                      void handleLogout();
                    }}
                  >
                    {isLoggingOut ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <LogOut className="h-4 w-4" />
                    )}
                    <span className="text-sm font-medium">Log out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <Link to="/login" search={{ next: undefined }}>
              <Button className="rounded-full px-5 font-semibold">Sign In</Button>
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
