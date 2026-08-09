import type { NormalizedPoseFrame, TrackedLandmark } from "@/modules/pose-capture";
import {
  MIN_VISIBLE_LANDMARKS,
  RECOGNITION_FRAME_COUNT,
  UNEXPECTED_MOTION_PENALTY_WEIGHT,
} from "../recognitionConfig";
import { resampleFrames } from "../resampleFrames";
import { usableFrames } from "../landmarkStatistics";
import { distanceToConfidence } from "./confidence";
import { unexpectedMotionPenalty } from "./unexpectedMotionPenalty";

export function compareDynamicMovement(
  templateFrames: NormalizedPoseFrame[],
  liveFrames: NormalizedPoseFrame[],
  landmarkWeights: Record<TrackedLandmark, number>,
  activeLandmarks: TrackedLandmark[],
) {
  const template = resampleFrames(usableFrames(templateFrames), RECOGNITION_FRAME_COUNT);
  const live = resampleFrames(usableFrames(liveFrames), RECOGNITION_FRAME_COUNT);
  if (template.length !== RECOGNITION_FRAME_COUNT || live.length !== RECOGNITION_FRAME_COUNT) {
    return 0;
  }

  // Require enough of the *active* landmarks per frame. Stays at MIN_VISIBLE_LANDMARKS when all
  // 12 are active; relaxes only for movements that intentionally select fewer.
  const minComparedLandmarks = Math.min(activeLandmarks.length, MIN_VISIBLE_LANDMARKS);
  const comparison = template.reduce(
    (total, templateFrame, index) => {
      const frame = compareFrame(
        templateFrame,
        live[index],
        landmarkWeights,
        activeLandmarks,
        minComparedLandmarks,
      );
      return frame
        ? {
            distance: total.distance + frame.distance,
            weight: total.weight + frame.weight,
          }
        : total;
    },
    { distance: 0, weight: 0 },
  );
  if (comparison.weight === 0) return 0;

  const averageDistance = comparison.distance / comparison.weight;
  const motionPenalty = unexpectedMotionPenalty(template, live, landmarkWeights, activeLandmarks);
  return distanceToConfidence(averageDistance + motionPenalty * UNEXPECTED_MOTION_PENALTY_WEIGHT);
}

function compareFrame(
  template: NormalizedPoseFrame,
  live: NormalizedPoseFrame,
  landmarkWeights: Record<TrackedLandmark, number>,
  activeLandmarks: TrackedLandmark[],
  minComparedLandmarks: number,
) {
  let distance = 0;
  let comparedLandmarks = 0;
  let weight = 0;

  for (const landmark of activeLandmarks) {
    const templatePoint = template.landmarks[landmark];
    const livePoint = live.landmarks[landmark];
    if (!templatePoint || !livePoint) continue;

    const landmarkWeight = landmarkWeights[landmark];
    distance +=
      Math.hypot(templatePoint.x - livePoint.x, templatePoint.y - livePoint.y) * landmarkWeight;
    comparedLandmarks += 1;
    weight += landmarkWeight;
  }

  return comparedLandmarks >= minComparedLandmarks ? { distance, weight } : null;
}
