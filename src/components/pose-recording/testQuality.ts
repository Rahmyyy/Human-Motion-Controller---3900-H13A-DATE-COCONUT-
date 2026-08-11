import {
  TRACKED_LANDMARKS,
  type RecordingQuality,
  type TrackedLandmark,
} from "@/modules/pose-capture";

/** Every tracked joint at the same visibility, so a test only states the ratio it cares about. */
export function jointVisibility(ratio: number): Record<TrackedLandmark, number> {
  return Object.fromEntries(TRACKED_LANDMARKS.map((index) => [index, ratio])) as Record<
    TrackedLandmark,
    number
  >;
}

/** A clean, saveable recording; tests override only the fields their case turns on. */
export function quality(overrides: Partial<RecordingQuality> = {}): RecordingQuality {
  return {
    status: "good",
    totalFrames: 100,
    usableFrames: 95,
    usableFramePercentage: 0.95,
    jointVisibility: jointVisibility(0.9),
    issues: [],
    ...overrides,
  };
}
