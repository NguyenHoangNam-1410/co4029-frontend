import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "../client";
import type { Notification } from "../types/student";

export function useNotifications() {
  return useQuery({
    queryKey: ["notifications"],
    queryFn: () => apiFetch<Notification[]>("/notifications"),
  });
}
