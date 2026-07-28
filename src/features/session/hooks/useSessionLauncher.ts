import { useEffect, useState, useSyncExternalStore } from "react";
import { createSessionLauncherService } from "../services/sessionLauncherService";

export function useSessionLauncher(patientId: string | undefined, presetId: string | undefined) {
  const [service] = useState(createSessionLauncherService);
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
