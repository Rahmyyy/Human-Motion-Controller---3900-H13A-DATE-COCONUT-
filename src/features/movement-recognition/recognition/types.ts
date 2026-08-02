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

/**
 * Resolve a user's selected-landmark indices into the ordered set of landmarks a movement should
 * actually be matched on. An empty/absent selection (legacy mappings, or a user who never touched
 * the selector) resolves to all tracked landmarks, so recognition behaves identically to before
 * this feature. The result is always in canonical TRACKED_LANDMARKS order.
 */
export function resolveActiveLandmarks(selected?: number[] | null): TrackedLandmark[] {
  if (!selected || selected.length === 0) {
    return [...TRACKED_LANDMARKS];
  }

  const selectedSet = new Set(selected);
  const active = TRACKED_LANDMARKS.filter((landmark) => selectedSet.has(landmark));
  return active.length > 0 ? active : [...TRACKED_LANDMARKS];
}

export type NormalizedPosePoint = {
  x: number;
  y: number;
};

export type NormalizedPoseFrame = {
  timestampMs: number;
  landmarks: Partial<Record<TrackedLandmark, NormalizedPosePoint>>;
  visibleCount: number;
};

export enum PressType {
  Toggle = "Toggle",
  Press = "Press",
  Release = "Release",
  Click = "Click",
}

export type PreparedMovementTemplate = {
  id: string;
  name: string;
  keybind: string;
  keypressType: PressType;
  frames: NormalizedPoseFrame[];
  landmarkWeights: Record<TrackedLandmark, number>;
  activeLandmarks: TrackedLandmark[];
  isDynamic: boolean;
  durationMs: number;
  keypressTriggerThreshold: number;
};

export type RecognitionMatch = {
  id: string;
  name: string;
  keybind: string;
  confidence: number;
  keypressTriggerThreshold: number;
  keypressType: PressType;
};

export type RecognitionMappingStatus = RecognitionMatch & {
  isActive: boolean;
};
