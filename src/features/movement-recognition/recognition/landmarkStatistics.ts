import { TRACKED_LANDMARKS, type NormalizedPoseFrame, type TrackedLandmark } from "./types";
import { MIN_VISIBLE_LANDMARKS } from "./recognitionConfig";

export function landmarkPoints(frames: NormalizedPoseFrame[], landmark: TrackedLandmark) {
  return frames.flatMap((frame) => {
    const point = frame.landmarks[landmark];
    return point ? [point] : [];
  });
}

export function landmarkCenter(frames: NormalizedPoseFrame[], landmark: TrackedLandmark) {
  const points = landmarkPoints(frames, landmark);
  if (points.length === 0) return null;

  const center = points.reduce(
    (total, point) => ({
      x: total.x + point.x,
      y: total.y + point.y,
    }),
    { x: 0, y: 0 },
  );

  return {
    x: center.x / points.length,
    y: center.y / points.length,
  };
}

export function landmarkSpread(frames: NormalizedPoseFrame[], landmark: TrackedLandmark) {
  const points = landmarkPoints(frames, landmark);
  const center = landmarkCenter(frames, landmark);
  if (points.length < 2 || !center) return 0;

  const squaredDistanceTotal = points.reduce(
    (total, point) => total + (point.x - center.x) ** 2 + (point.y - center.y) ** 2,
    0,
  );
  return Math.sqrt(squaredDistanceTotal / points.length);
}

export function trackedLandmarkRecord<T>(createValue: (landmark: TrackedLandmark) => T) {
  return Object.fromEntries(
    TRACKED_LANDMARKS.map((landmark) => [landmark, createValue(landmark)]),
  ) as Record<TrackedLandmark, T>;
}

export function usableFrames(frames: NormalizedPoseFrame[]) {
  return frames.filter((frame) => frame.visibleCount >= MIN_VISIBLE_LANDMARKS);
}
