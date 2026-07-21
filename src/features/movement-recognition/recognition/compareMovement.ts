import { compareDynamicMovement } from "./comparison/compareDynamicMovement";
import { compareStaticPose } from "./comparison/compareStaticPose";
import type { NormalizedPoseFrame, TrackedLandmark } from "./types";

export function compareMovement(
  templateFrames: NormalizedPoseFrame[],
  liveFrames: NormalizedPoseFrame[],
  landmarkWeights: Record<TrackedLandmark, number>,
  isDynamic: boolean,
) {
  return isDynamic
    ? compareDynamicMovement(templateFrames, liveFrames, landmarkWeights)
    : compareStaticPose(templateFrames, liveFrames);
}

export function compareDefaultPose(
  defaultPoseFrames: NormalizedPoseFrame[],
  liveFrames: NormalizedPoseFrame[],
) {
  return compareStaticPose(defaultPoseFrames, liveFrames);
}
