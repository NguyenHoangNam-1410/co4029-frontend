import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { useInfinitePage, type Page } from "@/lib/api/use-infinite-page";
import { createQueryWrapper } from "@/test/react-query-wrapper";

type Item = { id: string };

describe("useInfinitePage", () => {
  it("single-page result has hasNextPage=false and renders items", async () => {
    const fetchFn = async (): Promise<Page<Item>> => ({
      items: [{ id: "a" }, { id: "b" }],
      next_cursor: null,
    });

    const { Wrapper } = createQueryWrapper();
    const { result } = renderHook(
      () =>
        useInfinitePage<Item>({
          queryKey: ["test", "single"],
          fetch: fetchFn,
        }),
      { wrapper: Wrapper },
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.items.map((i) => i.id)).toEqual(["a", "b"]);
    expect(result.current.hasNextPage).toBe(false);
  });

  it("multi-page result merges items via fetchNextPage", async () => {
    let calls = 0;
    const fetchFn = async (cursor?: string): Promise<Page<Item>> => {
      calls += 1;
      if (cursor === undefined) {
        return { items: [{ id: "a" }, { id: "b" }], next_cursor: "page2" };
      }
      expect(cursor).toBe("page2");
      return { items: [{ id: "c" }], next_cursor: null };
    };

    const { Wrapper } = createQueryWrapper();
    const { result } = renderHook(
      () =>
        useInfinitePage<Item>({
          queryKey: ["test", "multi"],
          fetch: fetchFn,
        }),
      { wrapper: Wrapper },
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.items.map((i) => i.id)).toEqual(["a", "b"]);
    expect(result.current.hasNextPage).toBe(true);

    act(() => {
      result.current.fetchNextPage();
    });

    await waitFor(() =>
      expect(result.current.items.map((i) => i.id)).toEqual(["a", "b", "c"]),
    );
    expect(result.current.hasNextPage).toBe(false);
    expect(calls).toBe(2);
  });

  it("empty page yields hasNextPage=false and items=[]", async () => {
    const fetchFn = async (): Promise<Page<Item>> => ({
      items: [],
      next_cursor: null,
    });

    const { Wrapper } = createQueryWrapper();
    const { result } = renderHook(
      () =>
        useInfinitePage<Item>({
          queryKey: ["test", "empty"],
          fetch: fetchFn,
        }),
      { wrapper: Wrapper },
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.items).toEqual([]);
    expect(result.current.hasNextPage).toBe(false);
  });
});
