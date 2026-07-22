import { useEffect, useMemo, useSyncExternalStore } from "react";
import type { PoseFrame } from "@/features/camera/poseFrame";
import type { PresetMappingCardData } from "@/features/preset-mapping/types";
import { createRecognitionService } from "../services/recognitionService";

export type { RecognitionStatus } from "../services/recognitionService";

export function useMovementRecognition(
  mappings: PresetMappingCardData[],
  defaultPoseFrames: PoseFrame[] = [],
) {
  const service = useMemo(
    () => createRecognitionService(mappings, defaultPoseFrames),
    [defaultPoseFrames, mappings],
  );
  const status = useSyncExternalStore(service.subscribe, service.getSnapshot, service.getSnapshot);

  useEffect(() => {
    service.start();
    return service.stop;
  }, [service]);

  return { status };
}
