import { useEffect, useState, useSyncExternalStore } from "react";
import { createMappingEditorService } from "../services/mappingEditorService";

export function useMappingEditor(presetId: string | undefined, mappingId?: string) {
  const [service] = useState(createMappingEditorService);
  const snapshot = useSyncExternalStore(
    service.subscribe,
    service.getSnapshot,
    service.getSnapshot,
  );

  useEffect(() => {
    void service.start({ mappingId, presetId });
    return service.dispose;
  }, [mappingId, presetId, service]);

  return {
    ...snapshot,
    cancelCountdown: service.cancelCountdown,
    resetRecording: service.resetRecording,
    save: service.save,
    setKeybind: service.setKeybind,
    setMovementName: service.setMovementName,
    setSelectedLandmarks: service.setSelectedLandmarks,
    startRecording: service.startRecording,
    stopRecording: service.stopRecording,
    trimRecording: service.trimRecording,
  };
}
