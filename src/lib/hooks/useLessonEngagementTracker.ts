import { useEffect, useRef } from "react";
import { useReportEngagement } from "@/lib/api/hooks/progress";

/**
 * Tracks time-on-lesson and emits MaterialEngagement events.
 *
 * Strategy:
 * - Anchor "started_at" when the (materialVersionId, lessonId) pair becomes
 *   active. Fire a heartbeat every HEARTBEAT_MS while visible/focused, with
 *   the elapsed seconds and current ended_at = now.
 * - On unmount or when materialVersionId/lessonId changes, flush a final
 *   event covering the unsent tail.
 * - Skip emissions when the page is hidden (visibility API) — accumulating
 *   time while the tab is in the background overstates engagement.
 *
 * No-op when materialVersionId is null/undefined (e.g. lesson with no PDF
 * or video that the backend has resolved to a streamable version yet).
 *
 * The backend's `update_lesson_progress` triggers on every emission and
 * recomputes status/completion_percent from the engagement aggregate, so
 * a 30s cadence keeps `lesson_progress` ~live without DB churn.
 */
const HEARTBEAT_MS = 30_000;
const MIN_REPORT_SECONDS = 5;

export function useLessonEngagementTracker(opts: {
  materialVersionId: string | null | undefined;
  lessonId: string | null | undefined;
  courseId: string | null | undefined;
  scrollPositionPercent?: number | null;
}) {
  const { materialVersionId, lessonId, courseId, scrollPositionPercent } = opts;
  const mutation = useReportEngagement({
    lessonId: lessonId ?? undefined,
    courseId: courseId ?? undefined,
  });

  const startedAtRef = useRef<Date | null>(null);
  const lastEmitRef = useRef<Date | null>(null);
  const scrollRef = useRef<number | null>(scrollPositionPercent ?? null);
  const mutateRef = useRef(mutation.mutate);

  // keep refs hot without retriggering effect
  mutateRef.current = mutation.mutate;
  scrollRef.current =
    typeof scrollPositionPercent === "number"
      ? Math.min(100, Math.max(0, scrollPositionPercent))
      : null;

  useEffect(() => {
    if (!materialVersionId) return;

    const start = new Date();
    startedAtRef.current = start;
    lastEmitRef.current = start;

    function emit(now: Date) {
      const start = startedAtRef.current;
      const last = lastEmitRef.current;
      if (!start || !last) return;
      const elapsedSinceLast = Math.round(
        (now.getTime() - last.getTime()) / 1000,
      );
      if (elapsedSinceLast < MIN_REPORT_SECONDS) return;

      mutateRef.current({
        material_version_id: materialVersionId!,
        engagement_seconds: elapsedSinceLast,
        scroll_position_percent: scrollRef.current,
        started_at: last.toISOString(),
        ended_at: now.toISOString(),
      });
      lastEmitRef.current = now;
    }

    const interval = window.setInterval(() => {
      if (document.visibilityState !== "visible") return;
      emit(new Date());
    }, HEARTBEAT_MS);

    function handleVisibility() {
      // Flush whenever the tab leaves visibility — capture session before
      // the user closes/switches to avoid losing the tail.
      if (document.visibilityState === "hidden") emit(new Date());
    }
    document.addEventListener("visibilitychange", handleVisibility);

    function handleBeforeUnload() {
      emit(new Date());
    }
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("beforeunload", handleBeforeUnload);
      // Final flush when (materialVersionId, lessonId) changes or component unmounts.
      emit(new Date());
      startedAtRef.current = null;
      lastEmitRef.current = null;
    };
  }, [materialVersionId, lessonId]);
}
