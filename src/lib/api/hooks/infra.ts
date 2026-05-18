import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "../query-keys";

/**
 * Root URL for infrastructure probes (healthz/readyz).
 * These are mounted at the server root, NOT under /api/v1.
 */
const ROOT_URL = (
  import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000/api/v1"
)
  .replace(/\/api\/v1\/?$/, "");

export interface HealthzResponse {
  [key: string]: string;
}

export interface ReadyzResponse {
  [key: string]: unknown;
}

async function fetchPlain<T>(path: string): Promise<T> {
  const res = await fetch(`${ROOT_URL}${path}`);
  if (!res.ok) throw new Error(`${path} failed: ${res.status}`);
  return res.json() as Promise<T>;
}

export function useHealthz() {
  return useQuery({
    queryKey: queryKeys.infra.healthz(),
    queryFn: () => fetchPlain<HealthzResponse>("/healthz"),
    refetchInterval: 30_000,
    staleTime: 0,
  });
}

export function useReadyz() {
  return useQuery({
    queryKey: queryKeys.infra.readyz(),
    queryFn: () => fetchPlain<ReadyzResponse>("/readyz"),
    refetchInterval: 30_000,
    staleTime: 0,
  });
}
