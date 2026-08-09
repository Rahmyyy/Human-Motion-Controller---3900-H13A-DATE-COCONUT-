import type { NormalizedPoseFrame, TrackedLandmark } from "@/modules/pose-capture";
import { landmarkCenter, usableFrames } from "../landmarkStatistics";
import { MIN_VISIBLE_LANDMARKS, STATIC_POSE_ERROR_LANDMARKS } from "../recognitionConfig";
import { distanceToConfidence } from "./confidence";

export function compareStaticPose(
  templateFrames: NormalizedPoseFrame[],
  liveFrames: NormalizedPoseFrame[],
  activeLandmarks: TrackedLandmark[],
) {
  const template = usableFrames(templateFrames);
  const live = usableFrames(liveFrames);
  const liveFrame = live[live.length - 1];
  if (template.length === 0 || !liveFrame) return 0;

  const landmarkDistances = activeLandmarks.flatMap((landmark) => {
    const templatePoint = landmarkCenter(template, landmark);
    const livePoint = liveFrame.landmarks[landmark];
    if (!templatePoint || !livePoint) return [];

    return [Math.hypot(templatePoint.x - livePoint.x, templatePoint.y - livePoint.y)];
  });

  // Relative to the active count: stays MIN_VISIBLE_LANDMARKS when all 12 are active.
  if (landmarkDistances.length < Math.min(activeLandmarks.length, MIN_VISIBLE_LANDMARKS)) return 0;

  const largestErrors = landmarkDistances
    .sort((first, second) => second - first)
    .slice(0, STATIC_POSE_ERROR_LANDMARKS);
  const averageError =
    largestErrors.reduce((total, distance) => total + distance, 0) / largestErrors.length;
  return distanceToConfidence(averageError);
}
