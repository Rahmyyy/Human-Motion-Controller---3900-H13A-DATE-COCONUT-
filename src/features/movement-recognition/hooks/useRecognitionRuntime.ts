import { useEffect, useState, useSyncExternalStore } from "react";
import { createRecognitionRuntimeService } from "../services/recognitionRuntimeService";

export function useRecognitionRuntime(presetId: string | undefined) {
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
    void service.start(presetId);
    return service.dispose;
  }, [presetId, service]);

  return snapshot;
}
