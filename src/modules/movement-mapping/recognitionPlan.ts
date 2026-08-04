import {
  createPoseMotionProfile,
  normalizePoseFrames,
  resolveActiveLandmarks,
  trimLeadingIdleFrames,
} from "@/modules/pose-capture";
import {
  framesAtMovementThreshold,
  keypressTriggerThresholdFromPercentage,
  movementThresholdSettings,
} from "./analysis";
import { deserializeMappingPoseFrames } from "./serialization";
import type { MovementMapping, PreparedMovementPlan } from "./types";

export function prepareMovementPlans(mappings: MovementMapping[]): PreparedMovementPlan[] {
  return mappings.flatMap((mapping) => {
    const baselineFrames = deserializeMappingPoseFrames(mapping.poseFramesJson);
    const threshold = movementThresholdSettings(
      baselineFrames,
      mapping.selectedLandmarks,
      mapping.thresholdPercentage ?? 100,
    );
    const frames = threshold
      ? framesAtMovementThreshold(baselineFrames, threshold.effectivePercentage)
      : baselineFrames;
    if (frames.length < 2) return [];

    const normalizedFrames = trimLeadingIdleFrames(normalizePoseFrames(frames));
    if (normalizedFrames.length < 2) return [];

    const activeLandmarks = resolveActiveLandmarks(mapping.selectedLandmarks);
    const movementProfile = createPoseMotionProfile(normalizedFrames, activeLandmarks);
    return {
      id: mapping.id,
      name: mapping.name,
      keybind: mapping.keybind,
      keypressType: mapping.keypressType,
      frames: normalizedFrames,
      landmarkWeights: movementProfile.landmarkWeights,
      activeLandmarks,
      isDynamic: movementProfile.isDynamic,
      durationMs: movementDurationMs(normalizedFrames),
      keypressTriggerThreshold: keypressTriggerThresholdFromPercentage(
        mapping.keypressTriggerThresholdPercentage,
      ),
    };
  });
}

function movementDurationMs(frames: Array<{ timestampMs: number }>) {
  const firstFrame = frames[0];
  const lastFrame = frames[frames.length - 1];
  return Math.max(0, lastFrame.timestampMs - firstFrame.timestampMs);
}
