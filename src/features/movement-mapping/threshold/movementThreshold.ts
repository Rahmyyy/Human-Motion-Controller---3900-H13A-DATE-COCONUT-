import type { PoseFrame } from "@/features/camera/poseFrame";
import {
  createRecordingTrimRange,
  trimRecordingFrames,
} from "@/features/movement-mapping/recording/trimRecording";
import { analyseRecordingQuality } from "@/features/movement-mapping/recording/analyseRecordingQuality";
import { normalizePoseFrames } from "@/features/movement-recognition/recognition/normalizePose";
import { createMovementProfile } from "@/features/movement-recognition/recognition/template/createMovementProfile";
import { trimLeadingIdleFrames } from "@/features/movement-recognition/recognition/template/trimLeadingIdleFrames";
import { resolveActiveLandmarks } from "@/features/movement-recognition/recognition/types";

export type MovementThresholdSettings = {
  effectivePercentage: number;
  minimumPercentage: number;
};

export function movementThresholdSettings(
  frames: PoseFrame[],
  selectedLandmarks: number[],
  savedPercentage: number,
): MovementThresholdSettings | null {
  const activeLandmarks = resolveActiveLandmarks(selectedLandmarks);
  const fullMovement = preparedFrames(frames);

  if (fullMovement.length < 2 || !createMovementProfile(fullMovement, activeLandmarks).isDynamic) {
    return null;
  }

  let minimumPercentage = 100;
  for (let percentage = 1; percentage <= 100; percentage += 1) {
    const candidate = framesAtMovementThreshold(frames, percentage);
    if (analyseRecordingQuality(candidate, selectedLandmarks).status !== "unusable") {
      minimumPercentage = percentage;
      break;
    }
  }

  return {
    effectivePercentage: clamp(Math.round(savedPercentage), minimumPercentage, 100),
    minimumPercentage,
  };
}

export function framesAtMovementThreshold(frames: PoseFrame[], percentage: number) {
  const range = createRecordingTrimRange(frames);
  if (!range) return frames;

  return trimRecordingFrames(frames, {
    ...range,
    endMs: range.durationMs * (clamp(percentage, 0, 100) / 100),
  });
}

export function frameAtMovementThreshold(frames: PoseFrame[], percentage: number) {
  const thresholdFrames = framesAtMovementThreshold(frames, percentage);
  return thresholdFrames[thresholdFrames.length - 1] ?? frames[0] ?? null;
}

function preparedFrames(frames: PoseFrame[]) {
  return trimLeadingIdleFrames(normalizePoseFrames(frames));
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(Math.max(value, minimum), maximum);
}
