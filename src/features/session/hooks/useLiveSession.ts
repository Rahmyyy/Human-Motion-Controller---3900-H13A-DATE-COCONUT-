import { useEffect, useState, useSyncExternalStore } from "react";
import { createLiveSessionService } from "../services/liveSessionService";

export function useLiveSession(presetId: string | undefined) {
  const [service] = useState(createLiveSessionService);
  const snapshot = useSyncExternalStore(
    service.subscribe,
    service.getSnapshot,
    service.getSnapshot,
  );

  useEffect(() => {
    void service.start(presetId);
    return service.dispose;
  }, [presetId, service]);

  return { ...snapshot, endSession: service.end };
}
