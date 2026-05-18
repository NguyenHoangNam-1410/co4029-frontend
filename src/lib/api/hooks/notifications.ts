import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "../client";
import { queryKeys } from "../query-keys";
import { useInfinitePage } from "../use-infinite-page";
import type { Notification } from "../types";

/**
 * Inbox listing — cursor-paginated.
 *
 * Backend `GET /me/notifications` returns a bare `NotificationRead[]` (no
 * envelope) and accepts `?cursor=<created_at>&limit=<n>`. We adapt that
 * into the `Page<T>` shape `useInfinitePage` expects by deriving
 * `next_cursor` from the last item's `created_at` when the page is full.
 *
 * Caveat: when the total count is an exact multiple of `limit`, the final
 * `fetchNextPage` will resolve to an empty page. That's a one-extra-call
 * cost; acceptable given the backend doesn't surface an explicit
 * `has_next` flag and sentinel-driven IntersectionObserver tolerates it.
 *
 * Server filters out `delivery_status='cancelled'` (dismissed) rows so the
 * inbox only shows live notifications.
 */
export function useNotifications(limit = 20) {
  return useInfinitePage<Notification>({
    queryKey: queryKeys.notifications.inbox(),
    fetch: async (cursor, lim = limit) => {
      const params = new URLSearchParams();
      if (cursor) params.set("cursor", cursor);
      if (lim) params.set("limit", String(lim));
      const qs = params.toString();
      const items = await apiFetch<Notification[]>(
        qs ? `/me/notifications?${qs}` : "/me/notifications",
      );
      const pageSize = lim ?? limit;
      const next_cursor =
        items.length === pageSize && items.length > 0
          ? items[items.length - 1].created_at
          : null;
      return { items, next_cursor };
    },
    limit,
  });
}

export function useUnreadCount() {
  return useQuery({
    queryKey: queryKeys.notifications.unreadCount(),
    queryFn: () => apiFetch<{ unread: number }>("/me/notifications/unread-count"),
    staleTime: 1000 * 30,
  });
}
