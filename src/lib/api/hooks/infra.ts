import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "../query-keys";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000/api/v1";

export interface HealthzResponse {
  [key: string]: string;
}

export interface ReadyzResponse {
  [key: string]: unknown;
}

async function fetchPlain<T>(path: string): Promise<T> {
  const base = API_BASE_URL.replace(/\/$/, "");
  const res = await fetch(`${base}${path}`);
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
