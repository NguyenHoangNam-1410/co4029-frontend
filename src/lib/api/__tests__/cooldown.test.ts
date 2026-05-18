import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";

import { useCardCooldown } from "@/lib/api/cooldown";

describe("useCardCooldown", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("counts down 60s correctly", () => {
    const target = new Date("2026-01-01T00:01:00.000Z").toISOString();
    const { result } = renderHook(() => useCardCooldown(target));

    expect(result.current.remainingMs).toBe(60_000);
    expect(result.current.isExpired).toBe(false);

    act(() => {
      vi.advanceTimersByTime(30_000);
    });

    expect(result.current.remainingMs).toBe(30_000);
    expect(result.current.isExpired).toBe(false);
  });

  it("returns isExpired=true past target", () => {
    const target = new Date("2026-01-01T00:00:30.000Z").toISOString();
    const { result } = renderHook(() => useCardCooldown(target));

    act(() => {
      vi.advanceTimersByTime(45_000);
    });

    expect(result.current.remainingMs).toBe(0);
    expect(result.current.isExpired).toBe(true);
    expect(result.current.formatRemaining()).toBe("Sẵn sàng");
  });

  it("formatRemaining returns '1m 30s' for 90 seconds", () => {
    const target = new Date("2026-01-01T00:01:30.000Z").toISOString();
    const { result } = renderHook(() => useCardCooldown(target));

    expect(result.current.formatRemaining()).toBe("1m 30s");
  });
});
