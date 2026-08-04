export type PoseLandmark = {
  index: number;
  x: number;
  y: number;
  z: number;
  visibility: number;
};

export type PoseFrame = {
  timestampMs: number;
  landmarks: PoseLandmark[];
};

export const TRACKED_LANDMARKS = [11, 12, 13, 14, 15, 16, 23, 24, 25, 26, 27, 28] as const;

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

/** Empty and invalid legacy selections preserve the established all-landmarks fallback. */
export function resolveActiveLandmarks(selected?: number[] | null): TrackedLandmark[] {
  if (!selected || selected.length === 0) return [...TRACKED_LANDMARKS];

  const selectedSet = new Set(selected);
  const active = TRACKED_LANDMARKS.filter((landmark) => selectedSet.has(landmark));
  return active.length > 0 ? active : [...TRACKED_LANDMARKS];
}
