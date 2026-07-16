import type { PoseFrame } from "@/features/camera/poseFrame";

export const RECOGNITION_FRAME_COUNT = 24;
export const MIN_LANDMARK_VISIBILITY = 0.5;
export const MIN_VISIBLE_LANDMARKS = 6;
export const CONFIDENCE_THRESHOLD = 0.6;
export const REQUIRED_CONSECUTIVE_MATCHES = 5;
export const RELEASE_CONFIDENCE_THRESHOLD = 0.5;
export const REQUIRED_CONSECUTIVE_RELEASES = 3;
export const LIVE_BUFFER_MS = 2500;

export const TRACKED_LANDMARKS = [
  11, // left shoulder
  12, // right shoulder
  13, // left elbow
  14, // right elbow
  15, // left wrist
  16, // right wrist
  23, // left hip
  24, // right hip
  25, // left knee
  26, // right knee
  27, // left ankle
  28, // right ankle
] as const;

export type TrackedLandmark = (typeof TRACKED_LANDMARKS)[number];

export type NormalizedPosePoint = {
  x: number;
  y: number;
};

export type NormalizedPoseFrame = {
  timestampMs: number;
  landmarks: Partial<Record<TrackedLandmark, NormalizedPosePoint>>;
  visibleCount: number;
};

export type MovementTemplate = {
  id: string;
  name: string;
  keybind: string;
  frames: PoseFrame[];
};

export type PreparedMovementTemplate = {
  id: string;
  name: string;
  keybind: string;
  frames: NormalizedPoseFrame[];
  durationMs: number;
};

export type RecognitionMatch = {
  id: string;
  name: string;
  keybind: string;
  confidence: number;
};

export type RecognitionMappingStatus = RecognitionMatch & {
  isActive: boolean;
};
