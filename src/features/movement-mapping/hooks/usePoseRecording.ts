import { useEffect, useState, useSyncExternalStore } from "react";
import type { PoseFrame } from "@/features/camera/poseFrame";
import {
  createRecordingService,
  type RecordingService,
  type RecordingState,
} from "../services/recordingService";

export type { RecordingState } from "../services/recordingService";

export function usePoseRecording(
  initialFrames: PoseFrame[] = [],
  initialRecordingState: RecordingState = "idle",
) {
  const [service] = useState(() => createRecordingService(initialFrames, initialRecordingState));
  const snapshot = useSyncExternalStore(
    service.subscribe,
    service.getSnapshot,
    service.getSnapshot,
  );

  useEffect(() => {
    service.start();
    return service.stop;
  }, [service]);

  return { ...snapshot, ...serviceCommands(service) };
}

function serviceCommands(service: RecordingService) {
  return {
    cancelCountdown: service.cancelCountdown,
    resetRecording: service.resetRecording,
    startRecording: service.startRecording,
    stopRecording: service.stopRecording,
    trimRecording: service.trimRecording,
  };
}
