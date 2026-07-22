import { useEffect, useState, useSyncExternalStore } from "react";
import { createSessionLauncherService } from "../services/sessionLauncherService";

export function useSessionLauncher(presetId: string | undefined) {
  const [service] = useState(createSessionLauncherService);
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
