import { useEffect, useState, useSyncExternalStore } from "react";
import { createDefaultPoseCalibrationService } from "../services/defaultPoseCalibrationService";

export function useDefaultPoseCalibration(presetId: string | undefined) {
  const [service] = useState(createDefaultPoseCalibrationService);
  const snapshot = useSyncExternalStore(
    service.subscribe,
    service.getSnapshot,
    service.getSnapshot,
  );

  useEffect(() => {
    void service.start(presetId);
    return service.dispose;
  }, [presetId, service]);

  return {
    ...snapshot,
    cancelCountdown: service.cancelCountdown,
    resetRecording: service.resetRecording,
    save: service.save,
    startRecording: service.startRecording,
    stopRecording: service.stopRecording,
    trimRecording: service.trimRecording,
  };
}
