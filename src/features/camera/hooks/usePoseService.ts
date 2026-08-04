import { useCallback, useEffect, useSyncExternalStore } from "react";
import type { PoseFrame } from "@/modules/pose-capture";
import { poseService } from "../services/poseService";

export function usePoseService(video: HTMLVideoElement | null) {
  const snapshot = useSyncExternalStore(
    poseService.subscribeStatus,
    poseService.getSnapshot,
    poseService.getSnapshot,
  );

  useEffect(() => {
    if (!video) return;
    void poseService.start(video);
    return () => poseService.stop(video);
  }, [video]);

  const retry = useCallback(() => {
    if (video) void poseService.start(video);
  }, [video]);

  return { ...snapshot, retry };
}

export function usePoseFrames(listener: (frame: PoseFrame) => void) {
  useEffect(() => poseService.subscribeFrames(listener), [listener]);
}
