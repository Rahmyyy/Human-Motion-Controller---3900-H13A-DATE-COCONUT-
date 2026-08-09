import { useEffect, useState, useSyncExternalStore } from "react";
import { createSessionLauncher } from "@/modules/live-session";

export function useSessionLauncher(patientId: string | undefined, presetId: string | undefined) {
  const [service] = useState(createSessionLauncher);
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
