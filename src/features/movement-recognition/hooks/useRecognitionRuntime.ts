import { useEffect, useState, useSyncExternalStore } from "react";
import { createRecognitionRuntimeService } from "../services/recognitionRuntimeService";

export function useRecognitionRuntime(patientId: string | undefined, presetId: string | undefined) {
  const [service] = useState(() =>
    createRecognitionRuntimeService({
      defaultPoseRequiredMessage: "Record a default resting state before testing recognition.",
    }),
  );
  const snapshot = useSyncExternalStore(
    service.subscribe,
    service.getSnapshot,
    service.getSnapshot,
  );

  useEffect(() => {
    void service.start(patientId, presetId);
    return service.dispose;
  }, [patientId, presetId, service]);

  return snapshot;
}
