import type { PoseFrame, PoseLandmark } from "@/features/camera/poseFrame";
import { TRACKED_LANDMARKS, type NormalizedPoseFrame, type NormalizedPosePoint } from "./types";
import { distance, distanceLandmarks, isVisible, midpoint } from "./poseGeometry";

const LEFT_SHOULDER = 11;
const RIGHT_SHOULDER = 12;
const LEFT_HIP = 23;
const RIGHT_HIP = 24;
const MIN_SCALE = 0.0001;

export function normalizePoseFrame(frame: PoseFrame): NormalizedPoseFrame | null {
  const landmarks = new Map(frame.landmarks.map((landmark) => [landmark.index, landmark]));
  const shoulderMidpoint = midpoint(landmarks.get(LEFT_SHOULDER), landmarks.get(RIGHT_SHOULDER));
  const hipMidpoint = midpoint(landmarks.get(LEFT_HIP), landmarks.get(RIGHT_HIP));
  const center = hipMidpoint ?? shoulderMidpoint;

  if (!center) {
    return null;
  }

  const scale = resolveScale(landmarks, shoulderMidpoint, hipMidpoint);
  if (!scale) {
    return null;
  }

  const normalized: NormalizedPoseFrame["landmarks"] = {};
  let visibleCount = 0;

  for (const index of TRACKED_LANDMARKS) {
    const landmark = landmarks.get(index);
    if (!isVisible(landmark)) {
      continue;
    }

    normalized[index] = normalizePoint(landmark, center, scale);
    visibleCount += 1;
  }

  return {
    timestampMs: frame.timestampMs,
    landmarks: normalized,
    visibleCount,
  };
}

export function normalizePoseFrames(frames: PoseFrame[]) {
  return frames
    .map((frame) => normalizePoseFrame(frame))
    .filter((frame): frame is NormalizedPoseFrame => frame !== null);
}

function resolveScale(
  landmarks: Map<number, PoseLandmark>,
  shoulderMidpoint: NormalizedPosePoint | null,
  hipMidpoint: NormalizedPosePoint | null,
) {
  if (shoulderMidpoint && hipMidpoint) {
    const torsoLength = distance(shoulderMidpoint, hipMidpoint);
    if (torsoLength > MIN_SCALE) {
      return torsoLength;
    }
  }

  const shoulderWidth = distanceLandmarks(
    landmarks.get(LEFT_SHOULDER),
    landmarks.get(RIGHT_SHOULDER),
  );
  return shoulderWidth > MIN_SCALE ? shoulderWidth : null;
}

function normalizePoint(
  landmark: PoseLandmark,
  center: NormalizedPosePoint,
  scale: number,
): NormalizedPosePoint {
  return {
    x: (landmark.x - center.x) / scale,
    y: (landmark.y - center.y) / scale,
  };
}
