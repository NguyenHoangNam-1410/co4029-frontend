/**
 * Global gate that intercepts the rendered tree when the auth session
 * is mid-MFA and the user is anywhere except the MFA-completion route.
 *
 * Why: backend returns 403 {detail:{error:"mfa_required"}} on every
 * protected endpoint until ``auth_sessions.mfa_verified_at`` is set.
 * The fetch client (lib/api/client.ts) flips ``requiresMfa=true`` on
 * the auth store when it sees that response, and the OAuth callback
 * sets it from the login token's ``requires_mfa`` flag. This component
 * is the SPA's mirror of the backend gate — it pushes the user to
 * /login/mfa whenever requiresMfa is true, so the auth-bypass loophole
 * (paste /dashboard, F5 to skip the redirect) is closed at the UI
 * layer too.
 *
 * Allowed routes while requiresMfa=true:
 *  - /login/mfa     — the only place that can complete the second leg
 *  - /login         — user can abandon and re-login
 *  - /auth/google/callback — OAuth round-trip lands here first
 *  - /              — landing page, harmless
 *
 * Everything else replaces the current location with /login/mfa
 * (carrying ``next`` so we send them back where they were heading).
 */

import { useEffect } from "react";
import { useLocation, useNavigate } from "@tanstack/react-router";

import { useAuth } from "@/components/auth/AuthProvider";

const MFA_BYPASS_PATHS = new Set([
  "/login/mfa",
  "/login",
  "/auth/google/callback",
  "/",
]);

export function MfaGate({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, requiresMfa } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isAuthenticated || !requiresMfa) return;

    const path = location.pathname;
    if (MFA_BYPASS_PATHS.has(path)) return;

    void navigate({
      to: "/login/mfa",
      search: { next: path } as never,
      replace: true,
    });
  }, [isAuthenticated, requiresMfa, location.pathname, navigate]);

  return <>{children}</>;
}
