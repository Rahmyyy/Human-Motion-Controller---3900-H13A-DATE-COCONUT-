import {
  TRACKED_LANDMARKS,
  resolveActiveLandmarks,
  type NormalizedPoseFrame,
  type NormalizedPosePoint,
  type PoseFrame,
  type PoseLandmark,
  type TrackedLandmark,
} from "./domain";

const MIN_LANDMARK_VISIBILITY = 0.5;
const MIN_VISIBLE_LANDMARKS = 6;
const RECOGNITION_FRAME_COUNT = 24;
const MIN_DYNAMIC_SPREAD = 0.05;
const SIGNIFICANT_MOVEMENT_RATIO = 0.25;
const INACTIVE_WEIGHT_RATIO = 0.01;
const MOVEMENT_ONSET_DISTANCE = 0.08;
const MOVEMENT_ONSET_PADDING_FRAMES = 2;
const ONSET_REFERENCE_FRAMES = 5;
const GOOD_USABLE_FRAME_PERCENTAGE = 0.7;

export type PoseMotionProfile = {
  isDynamic: boolean;
  landmarkWeights: Record<TrackedLandmark, number>;
};

export type RecordingQualityStatus = "good" | "warning" | "unusable";
export type RecordingQualityIssue =
  | "no_pose_frames"
  | "insufficient_usable_frames"
  | "low_usable_frame_coverage"
  | "no_landmarks_selected"
  | "selection_misses_movement";

export type RecordingQuality = {
  status: RecordingQualityStatus;
  totalFrames: number;
  usableFrames: number;
  usableFramePercentage: number;
  jointVisibility: Record<TrackedLandmark, number>;
  issues: RecordingQualityIssue[];
};

export function normalizePoseFrame(frame: PoseFrame): NormalizedPoseFrame | null {
  const landmarks = new Map(frame.landmarks.map((landmark) => [landmark.index, landmark]));
  const shoulderMidpoint = midpoint(landmarks.get(11), landmarks.get(12));
  const hipMidpoint = midpoint(landmarks.get(23), landmarks.get(24));
  const center = hipMidpoint ?? shoulderMidpoint;
  if (!center) return null;

  const scale = resolveScale(landmarks, shoulderMidpoint, hipMidpoint);
  if (!scale) return null;

  const normalized: NormalizedPoseFrame["landmarks"] = {};
  let visibleCount = 0;
  for (const index of TRACKED_LANDMARKS) {
    const landmark = landmarks.get(index);
    if (!isVisible(landmark)) continue;
    normalized[index] = {
      x: (landmark.x - center.x) / scale,
      y: (landmark.y - center.y) / scale,
    };
    visibleCount += 1;
  }

  return { timestampMs: frame.timestampMs, landmarks: normalized, visibleCount };
}

export function normalizePoseFrames(frames: PoseFrame[]) {
  return frames
    .map(normalizePoseFrame)
    .filter((frame): frame is NormalizedPoseFrame => frame !== null);
}

export function trimLeadingIdleFrames(frames: NormalizedPoseFrame[]) {
  if (frames.length <= ONSET_REFERENCE_FRAMES) return frames;

  const referenceFrames = frames.slice(0, ONSET_REFERENCE_FRAMES);
  const referencePose = trackedLandmarkRecord((landmark) =>
    landmarkCenter(referenceFrames, landmark),
  );
  const onsetIndex = frames.findIndex((frame) =>
    TRACKED_LANDMARKS.some((landmark) => {
      const referencePoint = referencePose[landmark];
      const point = frame.landmarks[landmark];
      return Boolean(
        referencePoint && point && distance(referencePoint, point) >= MOVEMENT_ONSET_DISTANCE,
      );
    }),
  );

  return onsetIndex < 0
    ? frames
    : frames.slice(Math.max(0, onsetIndex - MOVEMENT_ONSET_PADDING_FRAMES));
}

export function createPoseMotionProfile(
  frames: NormalizedPoseFrame[],
  activeLandmarks: TrackedLandmark[],
): PoseMotionProfile {
  const spreads = new Map(
    activeLandmarks.map((landmark) => [landmark, landmarkSpread(frames, landmark)]),
  );
  const maximumSpread = Math.max(...spreads.values());
  const landmarkWeights = trackedLandmarkRecord(() => 0);

  if (maximumSpread < MIN_DYNAMIC_SPREAD) {
    for (const landmark of activeLandmarks) landmarkWeights[landmark] = 1;
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

/** Assesses a recording with the same preparation rules used for recognition plans. */
export function analyseRecordingQuality(
  frames: PoseFrame[],
  selectedLandmarks: number[] = [],
): RecordingQuality {
  const visibleFrameCounts = trackedLandmarkRecord(() => 0);
  for (const frame of frames) {
    const landmarks = new Map(frame.landmarks.map((landmark) => [landmark.index, landmark]));
    for (const index of TRACKED_LANDMARKS) {
      if (isVisible(landmarks.get(index))) visibleFrameCounts[index] += 1;
    }
  }

  const totalFrames = frames.length;
  const usableFrames = frames.filter(
    (frame) => (normalizePoseFrame(frame)?.visibleCount ?? 0) >= MIN_VISIBLE_LANDMARKS,
  ).length;
  const usableFramePercentage = totalFrames === 0 ? 0 : usableFrames / totalFrames;
  const jointVisibility = trackedLandmarkRecord((index) =>
    totalFrames === 0 ? 0 : visibleFrameCounts[index] / totalFrames,
  );
  const hasNoSelectedLandmarks = selectedLandmarks.length === 0;
  const selectionMissesMovement = detectSelectionMissesMovement(frames, selectedLandmarks);
  const issues: RecordingQualityIssue[] = [];

  if (totalFrames === 0) issues.push("no_pose_frames");
  else if (usableFrames < RECOGNITION_FRAME_COUNT) issues.push("insufficient_usable_frames");
  else if (usableFramePercentage < GOOD_USABLE_FRAME_PERCENTAGE) {
    issues.push("low_usable_frame_coverage");
  }
  if (hasNoSelectedLandmarks) issues.push("no_landmarks_selected");
  else if (selectionMissesMovement) issues.push("selection_misses_movement");

  const selectionInvalid = hasNoSelectedLandmarks || selectionMissesMovement;
  const status =
    usableFrames < RECOGNITION_FRAME_COUNT || selectionInvalid
      ? "unusable"
      : usableFramePercentage < GOOD_USABLE_FRAME_PERCENTAGE
        ? "warning"
        : "good";

  return { status, totalFrames, usableFrames, usableFramePercentage, jointVisibility, issues };
}

function detectSelectionMissesMovement(frames: PoseFrame[], selectedLandmarks: number[]) {
  const movementFrames = trimLeadingIdleFrames(normalizePoseFrames(frames));
  if (movementFrames.length < 2) return false;
  if (!createPoseMotionProfile(movementFrames, [...TRACKED_LANDMARKS]).isDynamic) return false;
  return !createPoseMotionProfile(movementFrames, resolveActiveLandmarks(selectedLandmarks))
    .isDynamic;
}

function isVisible(landmark: PoseLandmark | undefined): landmark is PoseLandmark {
  return Boolean(landmark && landmark.visibility >= MIN_LANDMARK_VISIBILITY);
}

function midpoint(first: PoseLandmark | undefined, second: PoseLandmark | undefined) {
  return isVisible(first) && isVisible(second)
    ? { x: (first.x + second.x) / 2, y: (first.y + second.y) / 2 }
    : null;
}

function resolveScale(
  landmarks: Map<number, PoseLandmark>,
  shoulderMidpoint: NormalizedPosePoint | null,
  hipMidpoint: NormalizedPosePoint | null,
) {
  if (shoulderMidpoint && hipMidpoint) {
    const torsoLength = distance(shoulderMidpoint, hipMidpoint);
    if (torsoLength > 0.0001) return torsoLength;
  }

  const left = landmarks.get(11);
  const right = landmarks.get(12);
  if (!isVisible(left) || !isVisible(right)) return null;
  const shoulderWidth = distance(left, right);
  return shoulderWidth > 0.0001 ? shoulderWidth : null;
}

function landmarkCenter(frames: NormalizedPoseFrame[], landmark: TrackedLandmark) {
  const points = frames.flatMap((frame) => {
    const point = frame.landmarks[landmark];
    return point ? [point] : [];
  });
  if (points.length === 0) return null;
  const sum = points.reduce((total, point) => ({ x: total.x + point.x, y: total.y + point.y }), {
    x: 0,
    y: 0,
  });
  return { x: sum.x / points.length, y: sum.y / points.length };
}

function landmarkSpread(frames: NormalizedPoseFrame[], landmark: TrackedLandmark) {
  const points = frames.flatMap((frame) => {
    const point = frame.landmarks[landmark];
    return point ? [point] : [];
  });
  const center = landmarkCenter(frames, landmark);
  if (points.length < 2 || !center) return 0;
  const total = points.reduce(
    (sum, point) => sum + (point.x - center.x) ** 2 + (point.y - center.y) ** 2,
    0,
  );
  return Math.sqrt(total / points.length);
}

function trackedLandmarkRecord<T>(createValue: (landmark: TrackedLandmark) => T) {
  return Object.fromEntries(
    TRACKED_LANDMARKS.map((landmark) => [landmark, createValue(landmark)]),
  ) as Record<TrackedLandmark, T>;
}

function distance(first: NormalizedPosePoint, second: NormalizedPosePoint) {
  return Math.hypot(first.x - second.x, first.y - second.y);
}
