import { landmarkCenter, usableFrames } from "../landmarkStatistics";
import { MIN_VISIBLE_LANDMARKS, STATIC_POSE_ERROR_LANDMARKS } from "../recognitionConfig";
import { TRACKED_LANDMARKS, type NormalizedPoseFrame } from "../types";
import { distanceToConfidence } from "./confidence";

export function compareStaticPose(
  templateFrames: NormalizedPoseFrame[],
  liveFrames: NormalizedPoseFrame[],
) {
  const template = usableFrames(templateFrames);
  const live = usableFrames(liveFrames);
  const liveFrame = live[live.length - 1];
  if (template.length === 0 || !liveFrame) return 0;

  const landmarkDistances = TRACKED_LANDMARKS.flatMap((landmark) => {
    const templatePoint = landmarkCenter(template, landmark);
    const livePoint = liveFrame.landmarks[landmark];
    if (!templatePoint || !livePoint) return [];

    return [Math.hypot(templatePoint.x - livePoint.x, templatePoint.y - livePoint.y)];
  });

  if (landmarkDistances.length < MIN_VISIBLE_LANDMARKS) return 0;

  const largestErrors = landmarkDistances
    .sort((first, second) => second - first)
    .slice(0, STATIC_POSE_ERROR_LANDMARKS);
  const averageError =
    largestErrors.reduce((total, distance) => total + distance, 0) / largestErrors.length;
  return distanceToConfidence(averageError);
}
