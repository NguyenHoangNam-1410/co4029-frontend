import { useMutation, useQuery } from "@tanstack/react-query";
import { apiFetch } from "../client";
import { queryKeys } from "../query-keys";
import type {
  GoogleLoginResponse,
  MyPermissions,
  TokenResponse,
  User,
} from "../types";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000/api/v1";

function apiUrl(path: string) {
  return `${API_BASE_URL.replace(/\/$/, "")}${path}`;
}

export function useMe() {
  return useQuery({
    queryKey: queryKeys.auth.me(),
    queryFn: () => apiFetch<User>("/users/me"),
    staleTime: 1000 * 60 * 5,
  });
}

export function useMyPermissions() {
  return useQuery({
    queryKey: queryKeys.auth.permissions(),
    queryFn: () => apiFetch<MyPermissions>("/users/me/permissions"),
    staleTime: 1000 * 60 * 5,
  });
}

export function useGoogleLoginUrl() {
  return useMutation({
    mutationFn: async (): Promise<GoogleLoginResponse> => {
      const response = await fetch(apiUrl("/auth/google/login"), {
        headers: { Accept: "application/json" },
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error(
          response.statusText || "Failed to start Google sign-in",
        );
      }

      return (await response.json()) as GoogleLoginResponse;
    },
  });
}

async function readErrorDetail(response: Response): Promise<string | null> {
  try {
    const body = (await response.json()) as { detail?: unknown };
    return typeof body?.detail === "string" ? body.detail : null;
  } catch {
    return null;
  }
}

export function useGoogleCallback() {
  return useMutation({
    mutationFn: async (code: string): Promise<TokenResponse> => {
      const query = new URLSearchParams({ code });
      const response = await fetch(
        apiUrl(`/auth/google/callback?${query.toString()}`),
        {
          headers: { Accept: "application/json" },
          cache: "no-store",
        },
      );

      if (!response.ok) {
        const detail = await readErrorDetail(response);
        throw new Error(
          detail ?? response.statusText ?? "Google sign-in failed",
        );
      }

      return (await response.json()) as TokenResponse;
    },
  });
}
