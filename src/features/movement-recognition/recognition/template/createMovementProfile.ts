import {
  INACTIVE_WEIGHT_RATIO,
  MIN_DYNAMIC_SPREAD,
  SIGNIFICANT_MOVEMENT_RATIO,
} from "../recognitionConfig";
import { landmarkSpread, trackedLandmarkRecord } from "../landmarkStatistics";
import { type NormalizedPoseFrame, type TrackedLandmark } from "../types";

export type MovementProfile = {
  isDynamic: boolean;
  landmarkWeights: Record<TrackedLandmark, number>;
};

/**
 * Build a movement's dynamic/static classification and per-landmark weights, considering only the
 * `activeLandmarks` the user selected. Landmarks outside the active set get a weight of 0 and are
 * never read by the comparison functions (which iterate the same active set). When every tracked
 * landmark is active this reduces exactly to the pre-selection behaviour.
 */
export function createMovementProfile(
  frames: NormalizedPoseFrame[],
  activeLandmarks: TrackedLandmark[],
): MovementProfile {
  const spreads = new Map(
    activeLandmarks.map((landmark) => [landmark, landmarkSpread(frames, landmark)]),
  );
  const maximumSpread = Math.max(...spreads.values());
  const landmarkWeights = trackedLandmarkRecord(() => 0);

  if (maximumSpread < MIN_DYNAMIC_SPREAD) {
    for (const landmark of activeLandmarks) {
      landmarkWeights[landmark] = 1;
    }
    return { isDynamic: false, landmarkWeights };
  }

  const significantMovement = maximumSpread * SIGNIFICANT_MOVEMENT_RATIO;
  const inactiveWeight = maximumSpread * INACTIVE_WEIGHT_RATIO;
  const rawWeights = new Map(
    activeLandmarks.map((landmark) => {
      const spread = spreads.get(landmark) ?? 0;
      return [landmark, spread >= significantMovement ? spread : inactiveWeight];
    }),
  );
  const total = [...rawWeights.values()].reduce((sum, weight) => sum + weight, 0);

  for (const landmark of activeLandmarks) {
    landmarkWeights[landmark] = ((rawWeights.get(landmark) ?? 0) / total) * activeLandmarks.length;
  }

  return { isDynamic: true, landmarkWeights };
}
