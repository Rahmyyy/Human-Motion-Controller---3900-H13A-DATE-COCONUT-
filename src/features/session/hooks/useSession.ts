import { useSyncExternalStore } from "react";
import { sessionService } from "../services/sessionService";

export function useSession() {
  const snapshot = useSyncExternalStore(
    sessionService.subscribe,
    sessionService.getSnapshot,
    sessionService.getSnapshot,
  );

  return {
    ...snapshot,
    endSession: sessionService.end,
    startSession: sessionService.start,
  };
}
