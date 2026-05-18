import { useMemo } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";

export type Page<T> = { items: T[]; next_cursor: string | null };

export type UseInfinitePageOptions<T> = {
  queryKey: readonly unknown[];
  fetch: (cursor?: string, limit?: number) => Promise<Page<T>>;
  limit?: number;
  enabled?: boolean;
};

export type UseInfinitePageResult<T> = {
  items: T[];
  hasNextPage: boolean;
  fetchNextPage: () => void;
  isFetchingNextPage: boolean;
  isLoading: boolean;
  isError: boolean;
  error: unknown;
};

export function useInfinitePage<T>(
  opts: UseInfinitePageOptions<T>,
): UseInfinitePageResult<T> {
  const { queryKey, fetch, limit = 20, enabled } = opts;

  const query = useInfiniteQuery<Page<T>, unknown>({
    queryKey,
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) =>
      fetch((pageParam as string | undefined) ?? undefined, limit),
    getNextPageParam: (lastPage) => lastPage.next_cursor ?? undefined,
    enabled,
  });

  const items = useMemo<T[]>(
    () => query.data?.pages.flatMap((p) => p.items) ?? [],
    [query.data],
  );

  return {
    items,
    hasNextPage: query.hasNextPage ?? false,
    fetchNextPage: () => {
      void query.fetchNextPage();
    },
    isFetchingNextPage: query.isFetchingNextPage,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
  };
}
