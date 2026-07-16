import type { PoseFrame } from "@/features/camera/poseFrame";
import type { PresetMappingCardData } from "@/features/preset-mapping/types";
import { normalizePoseFrames } from "./normalizePose";
import {
  TRACKED_LANDMARKS,
  type NormalizedPoseFrame,
  type PreparedMovementTemplate,
  type TrackedLandmark,
} from "./types";

const MIN_DYNAMIC_SPREAD = 0.05;
const SIGNIFICANT_MOVEMENT_RATIO = 0.25;
const INACTIVE_WEIGHT_RATIO = 0.01;

export function prepareMovementTemplates(
  mappings: PresetMappingCardData[],
): PreparedMovementTemplate[] {
  return mappings.flatMap((mapping) => {
    const frames = parsePoseFrames(mapping.poseFramesJson);
    if (frames.length < 2) {
      return [];
    }

    const normalizedFrames = normalizePoseFrames(frames);
    if (normalizedFrames.length < 2) {
      return [];
    }

    const movementProfile = movementLandmarkProfile(normalizedFrames);

    return {
      id: mapping.id,
      name: mapping.name,
      keybind: mapping.keybind,
      frames: normalizedFrames,
      landmarkWeights: movementProfile.landmarkWeights,
      isDynamic: movementProfile.isDynamic,
      durationMs: movementDurationMs(frames),
    };
  });
}

function movementLandmarkProfile(frames: NormalizedPoseFrame[]) {
  const spreads = trackedLandmarkRecord((index) => landmarkSpread(frames, index));
  const maximumSpread = Math.max(...Object.values(spreads));

  if (maximumSpread < MIN_DYNAMIC_SPREAD) {
    return {
      isDynamic: false,
      landmarkWeights: trackedLandmarkRecord(() => 1),
    };
  }

  const significantMovement = maximumSpread * SIGNIFICANT_MOVEMENT_RATIO;
  const inactiveWeight = maximumSpread * INACTIVE_WEIGHT_RATIO;
  const rawWeights = trackedLandmarkRecord((index) =>
    spreads[index] >= significantMovement ? spreads[index] : inactiveWeight,
  );
  const rawWeightTotal = Object.values(rawWeights).reduce((total, weight) => total + weight, 0);
  const normalizedWeightTotal = TRACKED_LANDMARKS.length;

  return {
    isDynamic: true,
    landmarkWeights: trackedLandmarkRecord(
      (index) => (rawWeights[index] / rawWeightTotal) * normalizedWeightTotal,
    ),
  };
}

function landmarkSpread(frames: NormalizedPoseFrame[], index: TrackedLandmark) {
  const points = frames.flatMap((frame) => {
    const point = frame.landmarks[index];
    return point ? [point] : [];
  });

  if (points.length < 2) {
    return 0;
  }

  const center = points.reduce((total, point) => ({ x: total.x + point.x, y: total.y + point.y }), {
    x: 0,
    y: 0,
  });
  center.x /= points.length;
  center.y /= points.length;

  const squaredDistanceTotal = points.reduce(
    (total, point) => total + (point.x - center.x) ** 2 + (point.y - center.y) ** 2,
    0,
  );
  return Math.sqrt(squaredDistanceTotal / points.length);
}

function trackedLandmarkRecord(createValue: (index: TrackedLandmark) => number) {
  return Object.fromEntries(
    TRACKED_LANDMARKS.map((index) => [index, createValue(index)]),
  ) as Record<TrackedLandmark, number>;
}

function parsePoseFrames(value: string): PoseFrame[] {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? (parsed as PoseFrame[]) : [];
  } catch {
    return [];
  }
}

function movementDurationMs(frames: PoseFrame[]) {
  const firstFrame = frames[0];
  const lastFrame = frames[frames.length - 1];
  return Math.max(0, lastFrame.timestampMs - firstFrame.timestampMs);
}
