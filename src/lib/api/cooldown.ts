import { useEffect, useMemo, useState } from "react";

export type UseCardCooldownResult = {
  remainingMs: number;
  isExpired: boolean;
  formatRemaining: () => string;
};

function computeRemainingMs(targetMs: number | null): number {
  if (targetMs === null) return 0;
  return Math.max(0, targetMs - Date.now());
}

export function useCardCooldown(
  retryAvailableAt: string | null,
): UseCardCooldownResult {
  const targetMs = useMemo(() => {
    if (!retryAvailableAt) return null;
    const parsed = Date.parse(retryAvailableAt);
    return Number.isNaN(parsed) ? null : parsed;
  }, [retryAvailableAt]);

  const [remainingMs, setRemainingMs] = useState<number>(() =>
    computeRemainingMs(targetMs),
  );

  useEffect(() => {
    setRemainingMs(computeRemainingMs(targetMs));
    if (targetMs === null) return;

    const id = setInterval(() => {
      setRemainingMs(computeRemainingMs(targetMs));
    }, 1000);

    return () => clearInterval(id);
  }, [targetMs]);

  const isExpired = remainingMs <= 0;

  const formatRemaining = (): string => {
    if (isExpired) return "Sẵn sàng";
    const totalSeconds = Math.ceil(remainingMs / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}m ${seconds}s`;
  };

  return { remainingMs, isExpired, formatRemaining };
}
