import { PressType, type PreparedMovementPlan } from "@/modules/movement-mapping";
import {
  TRACKED_LANDMARKS,
  createPoseMotionProfile,
  normalizePoseFrames,
  resolveActiveLandmarks,
  type PoseFrame,
  type TrackedLandmark,
} from "@/modules/pose-capture";

/**
 * A recognition plan built from real recorded frames, the way prepareMovementPlans builds one —
 * so comparison tests run against weights and durations the engine would actually see.
 */
export function plan(
  id: string,
  poseFrames: PoseFrame[],
  overrides: Partial<PreparedMovementPlan> = {},
): PreparedMovementPlan {
  const frames = normalizePoseFrames(poseFrames);
  const activeLandmarks = overrides.activeLandmarks ?? resolveActiveLandmarks([]);
  const profile = createPoseMotionProfile(frames, activeLandmarks);
  const timestamps = frames.map((frame) => frame.timestampMs);

  return {
    id,
    name: id,
    keybind: "Spacebar",
    keypressType: PressType.Click,
    frames,
    landmarkWeights: profile.landmarkWeights,
    activeLandmarks,
    isDynamic: profile.isDynamic,
    durationMs: timestamps.reduce((span, at) => Math.max(span, at - timestamps[0]), 0),
    keypressTriggerThreshold: 0.6,
    ...overrides,
  };
}

/** Every tracked joint weighed the same, as a held pose weighs them. */
export function evenWeights(weight = 1): Record<TrackedLandmark, number> {
  return Object.fromEntries(TRACKED_LANDMARKS.map((landmark) => [landmark, weight])) as Record<
    TrackedLandmark,
    number
  >;
}
