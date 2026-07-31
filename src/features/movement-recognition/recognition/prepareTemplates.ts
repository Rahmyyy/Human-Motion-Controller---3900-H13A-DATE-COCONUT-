import { parsePoseFrames } from "@/features/camera/parsePoseFrames";
import {
  framesAtMovementThreshold,
  movementThresholdSettings,
} from "@/features/movement-mapping/threshold/movementThreshold";
import type { PresetMappingCardData } from "@/features/preset-mapping/types";
import { normalizePoseFrames } from "./normalizePose";
import { keypressTriggerThresholdFromPercentage } from "./recognitionConfig";
import { resolveActiveLandmarks, type PreparedMovementTemplate } from "./types";
import { createMovementProfile } from "./template/createMovementProfile";
import { trimLeadingIdleFrames } from "./template/trimLeadingIdleFrames";

export function prepareMovementTemplates(
  mappings: PresetMappingCardData[],
): PreparedMovementTemplate[] {
  return mappings.flatMap((mapping) => {
    const baselineFrames = parsePoseFrames(mapping.poseFramesJson);
    const threshold = movementThresholdSettings(
      baselineFrames,
      mapping.selectedLandmarks,
      mapping.thresholdPercentage ?? 100,
    );
    const frames = threshold
      ? framesAtMovementThreshold(baselineFrames, threshold.effectivePercentage)
      : baselineFrames;
    if (frames.length < 2) {
      return [];
    }

    const normalizedFrames = trimLeadingIdleFrames(normalizePoseFrames(frames));
    if (normalizedFrames.length < 2) {
      return [];
    }

    const activeLandmarks = resolveActiveLandmarks(mapping.selectedLandmarks);
    const movementProfile = createMovementProfile(normalizedFrames, activeLandmarks);

    return {
      id: mapping.id,
      name: mapping.name,
      keybind: mapping.keybind,
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
