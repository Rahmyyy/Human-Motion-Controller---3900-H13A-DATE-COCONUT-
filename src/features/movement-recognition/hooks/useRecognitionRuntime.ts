import { useEffect, useState, useSyncExternalStore } from "react";
import { poseService } from "@/features/camera/services/poseService";
import { createPresetRecognitionRuntime, sessionTracker } from "@/modules/live-session";

export function useRecognitionRuntime(patientId: string | undefined, presetId: string | undefined) {
  const [service] = useState(() =>
    createPresetRecognitionRuntime(
      poseService,
      sessionTracker,
      "Record a default resting state before testing recognition.",
    ),
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
