import type { PoseLandmark } from "@/features/camera/poseFrame";
import { MIN_LANDMARK_VISIBILITY, type NormalizedPosePoint } from "./types";

export function isVisible(landmark: PoseLandmark | undefined): landmark is PoseLandmark {
  return Boolean(landmark && landmark.visibility >= MIN_LANDMARK_VISIBILITY);
}

export function midpoint(first: PoseLandmark | undefined, second: PoseLandmark | undefined) {
  if (!isVisible(first) || !isVisible(second)) {
    return null;
  }

  return {
    x: (first.x + second.x) / 2,
    y: (first.y + second.y) / 2,
  };
}

export function distance(first: NormalizedPosePoint, second: NormalizedPosePoint) {
  return Math.hypot(first.x - second.x, first.y - second.y);
}

export function distanceLandmarks(
  first: PoseLandmark | undefined,
  second: PoseLandmark | undefined,
) {
  if (!isVisible(first) || !isVisible(second)) {
    return 0;
  }

  return distance(first, second);
}
