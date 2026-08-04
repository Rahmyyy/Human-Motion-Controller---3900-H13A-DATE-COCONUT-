import type { NormalizedPoseFrame, TrackedLandmark } from "@/modules/pose-capture";
import { landmarkSpread } from "../landmarkStatistics";
import {
  INACTIVE_WEIGHT_MULTIPLIER,
  UNEXPECTED_MOTION_LANDMARKS,
  UNEXPECTED_MOTION_TOLERANCE,
} from "../recognitionConfig";

export function unexpectedMotionPenalty(
  templateFrames: NormalizedPoseFrame[],
  liveFrames: NormalizedPoseFrame[],
  landmarkWeights: Record<TrackedLandmark, number>,
  activeLandmarks: TrackedLandmark[],
) {
  // Only the active landmarks carry meaningful weights (unselected ones are 0), so the "should be
  // still" baseline is taken over the active set. With all 12 active this is unchanged.
  const minimumWeight = Math.min(...activeLandmarks.map((landmark) => landmarkWeights[landmark]));
  const unexpectedMotion = activeLandmarks.flatMap((landmark) => {
    if (landmarkWeights[landmark] > minimumWeight * INACTIVE_WEIGHT_MULTIPLIER) {
      return [];
    }

    const excessMotion =
      landmarkSpread(liveFrames, landmark) -
      landmarkSpread(templateFrames, landmark) -
      UNEXPECTED_MOTION_TOLERANCE;
    return excessMotion > 0 ? [excessMotion] : [];
  });

  const largestMovements = unexpectedMotion
    .sort((first, second) => second - first)
    .slice(0, UNEXPECTED_MOTION_LANDMARKS);
  if (largestMovements.length === 0) return 0;

  return (
    largestMovements.reduce((total, movement) => total + movement, 0) / largestMovements.length
  );
}
