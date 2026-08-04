import {
  analyseRecordingQuality,
  createPoseMotionProfile,
  createRecordingTrimRange,
  normalizePoseFrames,
  resolveActiveLandmarks,
  trimLeadingIdleFrames,
  trimRecordingFrames,
  type PoseFrame,
} from "@/modules/pose-capture";

export const MIN_KEYPRESS_TRIGGER_THRESHOLD_PERCENTAGE = 30;
export const MAX_KEYPRESS_TRIGGER_THRESHOLD_PERCENTAGE = 100;
export const DEFAULT_KEYPRESS_TRIGGER_THRESHOLD_PERCENTAGE = 60;

export type MovementThresholdSettings = {
  effectivePercentage: number;
  minimumPercentage: number;
};

export function movementThresholdSettings(
  frames: PoseFrame[],
  selectedLandmarks: number[],
  savedPercentage: number,
): MovementThresholdSettings | null {
  const activeLandmarks = resolveActiveLandmarks(selectedLandmarks);
  const fullMovement = trimLeadingIdleFrames(normalizePoseFrames(frames));
  if (
    fullMovement.length < 2 ||
    !createPoseMotionProfile(fullMovement, activeLandmarks).isDynamic
  ) {
    return null;
  }

  let minimumPercentage = 100;
  for (let percentage = 1; percentage <= 100; percentage += 1) {
    const candidate = framesAtMovementThreshold(frames, percentage);
    if (analyseRecordingQuality(candidate, selectedLandmarks).status !== "unusable") {
      minimumPercentage = percentage;
      break;
    }
  }

  return {
    effectivePercentage: clamp(Math.round(savedPercentage), minimumPercentage, 100),
    minimumPercentage,
  };
}

export function framesAtMovementThreshold(frames: PoseFrame[], percentage: number) {
  const range = createRecordingTrimRange(frames);
  if (!range) return frames;
  return trimRecordingFrames(frames, {
    ...range,
    endMs: range.durationMs * (clamp(percentage, 0, 100) / 100),
  });
}

export function frameAtMovementThreshold(frames: PoseFrame[], percentage: number) {
  const thresholdFrames = framesAtMovementThreshold(frames, percentage);
  return thresholdFrames[thresholdFrames.length - 1] ?? frames[0] ?? null;
}

export function keypressTriggerThresholdFromPercentage(percentage: number | undefined) {
  const finitePercentage =
    percentage !== undefined && Number.isFinite(percentage)
      ? Math.round(percentage)
      : DEFAULT_KEYPRESS_TRIGGER_THRESHOLD_PERCENTAGE;
  return (
    clamp(
      finitePercentage,
      MIN_KEYPRESS_TRIGGER_THRESHOLD_PERCENTAGE,
      MAX_KEYPRESS_TRIGGER_THRESHOLD_PERCENTAGE,
    ) / 100
  );
}

export function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(Math.max(value, minimum), maximum);
}
