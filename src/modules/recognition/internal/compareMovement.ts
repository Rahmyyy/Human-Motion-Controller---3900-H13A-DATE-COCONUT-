import {
  TRACKED_LANDMARKS,
  type NormalizedPoseFrame,
  type TrackedLandmark,
} from "@/modules/pose-capture";
import { compareDynamicMovement } from "./comparison/compareDynamicMovement";
import { compareStaticPose } from "./comparison/compareStaticPose";

export function compareMovement(
  templateFrames: NormalizedPoseFrame[],
  liveFrames: NormalizedPoseFrame[],
  landmarkWeights: Record<TrackedLandmark, number>,
  isDynamic: boolean,
  activeLandmarks: TrackedLandmark[],
) {
  return isDynamic
    ? compareDynamicMovement(templateFrames, liveFrames, landmarkWeights, activeLandmarks)
    : compareStaticPose(templateFrames, liveFrames, activeLandmarks);
}

export function compareDefaultPose(
  defaultPoseFrames: NormalizedPoseFrame[],
  liveFrames: NormalizedPoseFrame[],
) {
  // The default (resting) pose is a whole-body neutral check, so it always considers every
  // tracked landmark regardless of any per-movement selection.
  return compareStaticPose(defaultPoseFrames, liveFrames, [...TRACKED_LANDMARKS]);
}
