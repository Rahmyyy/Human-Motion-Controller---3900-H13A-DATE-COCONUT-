import { useEffect, useState, useSyncExternalStore } from "react";
import { createPresetSelectionService } from "@/modules/patient-presets";

export function usePresetSelection(patientId: string | undefined) {
  const [service] = useState(createPresetSelectionService);
  const snapshot = useSyncExternalStore(
    service.subscribe,
    service.getSnapshot,
    service.getSnapshot,
  );

  useEffect(() => {
    void service.start(patientId);
    return service.dispose;
  }, [patientId, service]);

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
