import { useEffect, useState, useSyncExternalStore } from "react";
import { createPresetMappingsService } from "../services/presetMappingsService";

export function usePresetMappings(presetId: string | undefined) {
  const [service] = useState(createPresetMappingsService);
  const snapshot = useSyncExternalStore(
    service.subscribe,
    service.getSnapshot,
    service.getSnapshot,
  );

  useEffect(() => {
    void service.start(presetId);
    return service.dispose;
  }, [presetId, service]);

  return { ...snapshot, deleteMapping: service.deleteMapping };
}
