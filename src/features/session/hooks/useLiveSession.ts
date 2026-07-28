import { useEffect, useState, useSyncExternalStore } from "react";
import { createLiveSessionService } from "../services/liveSessionService";

export function useLiveSession(patientId: string | undefined, presetId: string | undefined) {
  const [service] = useState(createLiveSessionService);
  const snapshot = useSyncExternalStore(
    service.subscribe,
    service.getSnapshot,
    service.getSnapshot,
  );

  useEffect(() => {
    void service.start(patientId, presetId);
    return service.dispose;
  }, [patientId, presetId, service]);

  return { ...snapshot, endSession: service.end };
}
