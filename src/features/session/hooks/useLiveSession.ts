import { useEffect, useState, useSyncExternalStore } from "react";
import { poseService } from "@/features/camera/services/poseService";
import { createLiveSession, sessionTracker } from "@/modules/live-session";

export function useLiveSession(
  patientId: string | undefined,
  presetId: string | undefined,
  sessionId: string | undefined,
) {
  const [service] = useState(() => createLiveSession(poseService, sessionTracker));
  const snapshot = useSyncExternalStore(
    service.subscribe,
    service.getSnapshot,
    service.getSnapshot,
  );

  useEffect(() => {
    void service.start(patientId, presetId, sessionId);
    return service.dispose;
  }, [patientId, presetId, service, sessionId]);

  return { ...snapshot, endSession: service.end };
}
