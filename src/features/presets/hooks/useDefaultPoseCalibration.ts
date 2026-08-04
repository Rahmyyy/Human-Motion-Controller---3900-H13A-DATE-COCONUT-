import { useEffect, useState, useSyncExternalStore } from "react";
import { poseService } from "@/features/camera/services/poseService";
import {
  createDefaultPoseCalibration,
  type DefaultPoseCalibrationViewModel,
} from "@/modules/patient-presets";

export function useDefaultPoseCalibration(
  patientId: string | undefined,
  presetId: string | undefined,
): DefaultPoseCalibrationViewModel {
  const [service] = useState(() => createDefaultPoseCalibration(poseService));
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
