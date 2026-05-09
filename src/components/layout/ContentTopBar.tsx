import { Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Bell, Loader2, Settings, LogOut, User } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { getAuthDisplayName, getAuthUserInitials } from "@/lib/auth";

export default function ContentTopBar() {
  const { logout, user } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
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
    <header className="w-full sticky top-0 z-40 bg-m3-surface/80 backdrop-blur-md flex items-center justify-end px-8 h-16">
      <div className="flex items-center gap-4">
        <button
          className="relative text-m3-on-surface-variant cursor-pointer hover:bg-m3-primary-fixed p-2.5 rounded-full transition-colors"
          aria-label="Notifications"
        >
          <Bell className="h-5 w-5" />
          <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-m3-secondary ring-2 ring-m3-surface" />
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
                <Link to="/settings" className="flex items-center gap-3 w-full">
                  <Settings className="h-4 w-4 text-m3-on-surface-variant" />
                  <span className="text-sm font-medium">Settings</span>
                </Link>
              </DropdownMenuItem>

              <DropdownMenuItem className="rounded-lg px-3 py-2 gap-3 cursor-pointer text-m3-on-surface hover:bg-m3-primary-fixed focus:bg-m3-primary-fixed focus:text-m3-primary">
                <Link to="/settings" className="flex items-center gap-3 w-full">
                  <User className="h-4 w-4 text-m3-on-surface-variant" />
                  <span className="text-sm font-medium">Profile</span>
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
      </div>
    </header>
  );
}
