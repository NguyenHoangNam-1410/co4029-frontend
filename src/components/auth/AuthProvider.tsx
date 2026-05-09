import { createContext, useContext, useEffect, useState } from "react";

import {
  AUTH_CHANGED_EVENT,
  getCurrentUser,
  getStoredAuthSession,
  isStoredSessionExpired,
  logout as logoutRequest,
  refreshAuthSession,
  type AuthUser,
} from "@/lib/auth";

type AuthStatus = "loading" | "authenticated" | "unauthenticated";

interface AuthContextValue {
  status: AuthStatus;
  isAuthenticated: boolean;
  requiresMfa: boolean;
  user: AuthUser | null;
  refreshUser: () => Promise<AuthUser | null>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function applySessionState(setState: (nextState: {
  status: AuthStatus;
  requiresMfa: boolean;
  user: AuthUser | null;
}) => void) {
  const session = getStoredAuthSession();

  if (session) {
    setState({
      status: "authenticated",
      requiresMfa: session.requiresMfa,
      user: session.user,
    });
    return session;
  }

  setState({ status: "unauthenticated", requiresMfa: false, user: null });
  return null;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [authState, setAuthState] = useState<{
    status: AuthStatus;
    requiresMfa: boolean;
    user: AuthUser | null;
  }>({
    status: "loading",
    requiresMfa: false,
    user: null,
  });

  useEffect(() => {
    let isCurrent = true;

    function setState(nextState: {
      status: AuthStatus;
      requiresMfa: boolean;
      user: AuthUser | null;
    }) {
      if (isCurrent) {
        setAuthState(nextState);
      }
    }

    function syncFromStorage() {
      applySessionState(setState);
    }

    async function hydrateSession() {
      const session = applySessionState(setState);

      if (!session) {
        return;
      }

      if (isStoredSessionExpired(session)) {
        try {
          const refreshedSession = await refreshAuthSession();

          if (!isCurrent) return;

          if (refreshedSession) {
            setState({
              status: "authenticated",
              requiresMfa: refreshedSession.requiresMfa,
              user: refreshedSession.user,
            });
            return;
          }
        } catch {
          setState({ status: "unauthenticated", requiresMfa: false, user: null });
          return;
        }
      }

      try {
        const user = await getCurrentUser();
        const currentSession = getStoredAuthSession();
        setState({
          status: "authenticated",
          requiresMfa: currentSession?.requiresMfa ?? false,
          user,
        });
      } catch {
        syncFromStorage();
      }
    }

    void hydrateSession();

    window.addEventListener("storage", syncFromStorage);
    window.addEventListener(AUTH_CHANGED_EVENT, syncFromStorage);

    return () => {
      isCurrent = false;
      window.removeEventListener("storage", syncFromStorage);
      window.removeEventListener(AUTH_CHANGED_EVENT, syncFromStorage);
    };
  }, []);

  async function refreshUser() {
    try {
      const user = await getCurrentUser();
      const session = getStoredAuthSession();
      setAuthState({
        status: "authenticated",
        requiresMfa: session?.requiresMfa ?? false,
        user,
      });
      return user;
    } catch {
      const session = getStoredAuthSession();
      if (session) {
        setAuthState({
          status: "authenticated",
          requiresMfa: session.requiresMfa,
          user: session.user,
        });
        return session.user;
      }
      setAuthState({ status: "unauthenticated", requiresMfa: false, user: null });
      return null;
    }
  }

  async function logout() {
    await logoutRequest();
    setAuthState({ status: "unauthenticated", requiresMfa: false, user: null });
  }

  return (
    <AuthContext.Provider
      value={{
        status: authState.status,
        isAuthenticated: authState.status === "authenticated",
        requiresMfa: authState.requiresMfa,
        user: authState.user,
        refreshUser,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }

  return context;
}
