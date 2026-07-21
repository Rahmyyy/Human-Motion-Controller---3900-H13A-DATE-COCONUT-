import { useEffect, useState, useSyncExternalStore } from "react";
import {
  getElapsedMs,
  getEndedAt,
  getSessionStatus,
  getStartedAt,
  getTriggerCount,
  subscribe,
} from "@/lib/liveSessionState";

/**
 * Reads the live session store and keeps the elapsed time ticking while the
 * session runs. The overlay needs duration and trigger count together, so it
 * subscribes once here rather than wiring each value up at the component.
 */
export function useSessionSnapshot() {
  const status = useSyncExternalStore(subscribe, getSessionStatus);
  const startedAt = useSyncExternalStore(subscribe, getStartedAt);
  const endedAt = useSyncExternalStore(subscribe, getEndedAt);
  const triggerCount = useSyncExternalStore(subscribe, getTriggerCount);

  // Forces a re-render once a second so the duration display keeps moving.
  // The counter value itself is unused — elapsed time is always recomputed
  // from the timestamps above.
  const [, tick] = useState(0);

  useEffect(() => {
    if (status !== "running") return;

    const intervalId = setInterval(() => tick((n) => n + 1), 1000);
    return () => clearInterval(intervalId);
  }, [status]);

  return {
    status,
    triggerCount,
    elapsedMs: getElapsedMs(status, startedAt, endedAt),
  };
}
