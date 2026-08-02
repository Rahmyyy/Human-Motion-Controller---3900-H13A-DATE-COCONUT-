import { useEffect, useState, useSyncExternalStore } from "react";
import { createMappingEditorService } from "../services/mappingEditorService";

export function useMappingEditor(
  patientId: string | undefined,
  presetId: string | undefined,
  mappingId?: string,
) {
  const [service] = useState(createMappingEditorService);
  const snapshot = useSyncExternalStore(
    service.subscribe,
    service.getSnapshot,
    service.getSnapshot,
  );

  useEffect(() => {
    void service.start({ mappingId, patientId, presetId });
    return service.dispose;
  }, [mappingId, patientId, presetId, service]);

  return {
    ...snapshot,
    cancelCountdown: service.cancelCountdown,
    resetRecording: service.resetRecording,
    save: service.save,
    setKeybind: service.setKeybind,
    setKeypressType: service.setKeypressType,
    setKeypressTriggerThreshold: service.setKeypressTriggerThreshold,
    setMovementName: service.setMovementName,
    setSelectedLandmarks: service.setSelectedLandmarks,
    startRecording: service.startRecording,
    stopRecording: service.stopRecording,
    trimRecording: service.trimRecording,
  };
}
