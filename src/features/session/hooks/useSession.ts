import { useSyncExternalStore } from "react";
import { sessionTracker } from "@/modules/live-session";

export function useSession() {
  const snapshot = useSyncExternalStore(
    sessionTracker.subscribe,
    sessionTracker.getSnapshot,
    sessionTracker.getSnapshot,
  );

  return {
    ...snapshot,
    endSession: sessionTracker.end,
    startSession: sessionTracker.start,
  };
}
