import {
  MIN_VISIBLE_LANDMARKS,
  RECOGNITION_FRAME_COUNT,
  UNEXPECTED_MOTION_PENALTY_WEIGHT,
} from "../recognitionConfig";
import { resampleFrames } from "../resampleFrames";
import { TRACKED_LANDMARKS, type NormalizedPoseFrame, type TrackedLandmark } from "../types";
import { usableFrames } from "../landmarkStatistics";
import { distanceToConfidence } from "./confidence";
import { unexpectedMotionPenalty } from "./unexpectedMotionPenalty";

export function compareDynamicMovement(
  templateFrames: NormalizedPoseFrame[],
  liveFrames: NormalizedPoseFrame[],
  landmarkWeights: Record<TrackedLandmark, number>,
) {
  const template = resampleFrames(usableFrames(templateFrames), RECOGNITION_FRAME_COUNT);
  const live = resampleFrames(usableFrames(liveFrames), RECOGNITION_FRAME_COUNT);
  if (template.length !== RECOGNITION_FRAME_COUNT || live.length !== RECOGNITION_FRAME_COUNT) {
    return 0;
  }

  const comparison = template.reduce(
    (total, templateFrame, index) => {
      const frame = compareFrame(templateFrame, live[index], landmarkWeights);
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
  const motionPenalty = unexpectedMotionPenalty(template, live, landmarkWeights);
  return distanceToConfidence(averageDistance + motionPenalty * UNEXPECTED_MOTION_PENALTY_WEIGHT);
}

function compareFrame(
  template: NormalizedPoseFrame,
  live: NormalizedPoseFrame,
  landmarkWeights: Record<TrackedLandmark, number>,
) {
  let distance = 0;
  let comparedLandmarks = 0;
  let weight = 0;

  for (const landmark of TRACKED_LANDMARKS) {
    const templatePoint = template.landmarks[landmark];
    const livePoint = live.landmarks[landmark];
    if (!templatePoint || !livePoint) continue;

    const landmarkWeight = landmarkWeights[landmark];
    distance +=
      Math.hypot(templatePoint.x - livePoint.x, templatePoint.y - livePoint.y) * landmarkWeight;
    comparedLandmarks += 1;
    weight += landmarkWeight;
  }

  return comparedLandmarks >= MIN_VISIBLE_LANDMARKS ? { distance, weight } : null;
}
