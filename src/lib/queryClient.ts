/**
 * TanStack Query client with project-wide defaults.
 *
 * Conventions & rationale documented in:
 *   docs/frontend-cutover/qc-conventions.md
 *
 * Per-hook overrides are discouraged — prefer adjusting defaults here
 * or using domain-specific staleTime only when explicitly justified.
 */
import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      gcTime: 5 * 60_000,
      retry: 1,
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
    },
    mutations: {
      retry: 0,
    },
  },
});
