import type { PoseFrame } from "@/features/camera/poseFrame";

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
  landmarkWeights: Record<TrackedLandmark, number>;
  isDynamic: boolean;
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
