export const RECOGNITION_FRAME_COUNT = 24;
export const MIN_LANDMARK_VISIBILITY = 0.5;
export const MIN_VISIBLE_LANDMARKS = 6;

export const MIN_KEYPRESS_TRIGGER_THRESHOLD_PERCENTAGE = 30;
export const MAX_KEYPRESS_TRIGGER_THRESHOLD_PERCENTAGE = 100;
export const DEFAULT_KEYPRESS_TRIGGER_THRESHOLD_PERCENTAGE = 60;
export const MINIMUM_CONFIDENCE_MARGIN = 0.08;
export const REQUIRED_CONSECUTIVE_MATCHES = 5;

export const DEFAULT_POSE_REARM_THRESHOLD = 0.8;
export const REQUIRED_DEFAULT_POSE_FRAMES = 3;

export const LIVE_BUFFER_MS = 2500;
export const MIN_TEMPLATE_WINDOW_MS = 700;

export const MIN_DYNAMIC_SPREAD = 0.05;
export const SIGNIFICANT_MOVEMENT_RATIO = 0.25;
export const INACTIVE_WEIGHT_RATIO = 0.01;

export const MOVEMENT_ONSET_DISTANCE = 0.08;
export const MOVEMENT_ONSET_PADDING_FRAMES = 2;
export const ONSET_REFERENCE_FRAMES = 5;

export const STATIC_POSE_ERROR_LANDMARKS = 4;
export const INACTIVE_WEIGHT_MULTIPLIER = 1.5;
export const UNEXPECTED_MOTION_LANDMARKS = 2;
export const UNEXPECTED_MOTION_TOLERANCE = 0.08;
export const UNEXPECTED_MOTION_PENALTY_WEIGHT = 0.75;

export function keypressTriggerThresholdFromPercentage(percentage: number | undefined) {
  const finitePercentage =
    percentage !== undefined && Number.isFinite(percentage)
      ? Math.round(percentage)
      : DEFAULT_KEYPRESS_TRIGGER_THRESHOLD_PERCENTAGE;
  const clampedPercentage = Math.min(
    Math.max(finitePercentage, MIN_KEYPRESS_TRIGGER_THRESHOLD_PERCENTAGE),
    MAX_KEYPRESS_TRIGGER_THRESHOLD_PERCENTAGE,
  );

  return clampedPercentage / 100;
}
