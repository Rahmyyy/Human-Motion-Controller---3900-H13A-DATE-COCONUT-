import {
  INACTIVE_WEIGHT_RATIO,
  MIN_DYNAMIC_SPREAD,
  SIGNIFICANT_MOVEMENT_RATIO,
} from "../recognitionConfig";
import { landmarkSpread, trackedLandmarkRecord } from "../landmarkStatistics";
import { TRACKED_LANDMARKS, type NormalizedPoseFrame, type TrackedLandmark } from "../types";

export type MovementProfile = {
  isDynamic: boolean;
  landmarkWeights: Record<TrackedLandmark, number>;
};

export function createMovementProfile(frames: NormalizedPoseFrame[]): MovementProfile {
  const spreads = trackedLandmarkRecord((landmark) => landmarkSpread(frames, landmark));
  const maximumSpread = Math.max(...Object.values(spreads));

  if (maximumSpread < MIN_DYNAMIC_SPREAD) {
    return {
      isDynamic: false,
      landmarkWeights: trackedLandmarkRecord(() => 1),
    };
  }

  const significantMovement = maximumSpread * SIGNIFICANT_MOVEMENT_RATIO;
  const inactiveWeight = maximumSpread * INACTIVE_WEIGHT_RATIO;
  const rawWeights = trackedLandmarkRecord((landmark) =>
    spreads[landmark] >= significantMovement ? spreads[landmark] : inactiveWeight,
  );
  const total = Object.values(rawWeights).reduce((sum, weight) => sum + weight, 0);

  return {
    isDynamic: true,
    landmarkWeights: trackedLandmarkRecord(
      (landmark) => (rawWeights[landmark] / total) * TRACKED_LANDMARKS.length,
    ),
  };
}
