import { useEffect, useState, useSyncExternalStore } from "react";
import { createPresetMappingsService } from "../services/presetMappingsService";

export function usePresetMappings(patientId: string | undefined, presetId: string | undefined) {
  const [service] = useState(createPresetMappingsService);
  const snapshot = useSyncExternalStore(
    service.subscribe,
    service.getSnapshot,
    service.getSnapshot,
  );

  useEffect(() => {
    void service.start(patientId, presetId);
    return service.dispose;
  }, [patientId, presetId, service]);

  return { ...snapshot, deleteMapping: service.deleteMapping };
}
