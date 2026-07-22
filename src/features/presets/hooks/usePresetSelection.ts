import { useEffect, useState, useSyncExternalStore } from "react";
import { createPresetSelectionService } from "../services/presetSelectionService";

export function usePresetSelection() {
  const [service] = useState(createPresetSelectionService);
  const snapshot = useSyncExternalStore(
    service.subscribe,
    service.getSnapshot,
    service.getSnapshot,
  );

  useEffect(() => {
    void service.start();
    return service.dispose;
  }, [service]);

  return {
    ...snapshot,
    clearCreateError: service.clearCreateError,
    clearDeleteError: service.clearDeleteError,
    clearDuplicateError: service.clearDuplicateError,
    createPreset: service.createPreset,
    deletePreset: service.deletePreset,
    duplicatePreset: service.duplicatePreset,
    selectPreset: service.selectPreset,
  };
}
