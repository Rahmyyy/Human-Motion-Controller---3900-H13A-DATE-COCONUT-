import { landmarkSpread } from "../landmarkStatistics";
import {
  INACTIVE_WEIGHT_MULTIPLIER,
  UNEXPECTED_MOTION_LANDMARKS,
  UNEXPECTED_MOTION_TOLERANCE,
} from "../recognitionConfig";
import { TRACKED_LANDMARKS, type NormalizedPoseFrame, type TrackedLandmark } from "../types";

export function unexpectedMotionPenalty(
  templateFrames: NormalizedPoseFrame[],
  liveFrames: NormalizedPoseFrame[],
  landmarkWeights: Record<TrackedLandmark, number>,
) {
  const minimumWeight = Math.min(...Object.values(landmarkWeights));
  const unexpectedMotion = TRACKED_LANDMARKS.flatMap((landmark) => {
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
