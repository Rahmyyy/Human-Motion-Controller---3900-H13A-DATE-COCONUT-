import { useEffect, useState, useSyncExternalStore } from "react";
import { createDefaultPoseCalibrationService } from "../services/defaultPoseCalibrationService";

export function useDefaultPoseCalibration(
  patientId: string | undefined,
  presetId: string | undefined,
) {
  const [service] = useState(createDefaultPoseCalibrationService);
  const snapshot = useSyncExternalStore(
    service.subscribe,
    service.getSnapshot,
    service.getSnapshot,
  );

  useEffect(() => {
    void service.start(patientId, presetId);
    return service.dispose;
  }, [patientId, presetId, service]);

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
