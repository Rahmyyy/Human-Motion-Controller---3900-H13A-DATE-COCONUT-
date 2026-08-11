import {
  TRACKED_LANDMARKS,
  type PoseFrame,
  type PoseLandmark,
  type TrackedLandmark,
} from "./domain";
import type { PoseFrameSource } from "./recording";

/**
 * A neutral standing body in image coordinates: shoulders one torso-length above the hips, arms
 * hanging down. Normalization centres on the hip midpoint and divides by the 0.4 torso length,
 * so an image-space offset of 0.4 is one normalized unit.
 */
const NEUTRAL_BODY: Record<TrackedLandmark, { x: number; y: number }> = {
  11: { x: 0.4, y: 0.3 },
  12: { x: 0.6, y: 0.3 },
  13: { x: 0.38, y: 0.45 },
  14: { x: 0.62, y: 0.45 },
  15: { x: 0.36, y: 0.6 },
  16: { x: 0.64, y: 0.6 },
  23: { x: 0.45, y: 0.7 },
  24: { x: 0.55, y: 0.7 },
  25: { x: 0.45, y: 0.85 },
  26: { x: 0.55, y: 0.85 },
  27: { x: 0.45, y: 1.0 },
  28: { x: 0.55, y: 1.0 },
};

export const TORSO_LENGTH = 0.4;

export type PoseOverrides = Partial<Record<TrackedLandmark, Partial<PoseLandmark>>>;

/** One frame of the neutral body; a test overrides only the joints its case turns on. */
export function poseFrame(timestampMs: number, overrides: PoseOverrides = {}): PoseFrame {
  return {
    timestampMs,
    landmarks: TRACKED_LANDMARKS.map((index) => ({
      index,
      z: 0,
      visibility: 0.9,
      ...NEUTRAL_BODY[index],
      ...overrides[index],
    })),
  };
}

/** A recording of someone holding still, at the 40 ms cadence the camera delivers. */
export function stillPoseFrames(count: number, startMs = 0, overrides: PoseOverrides = {}) {
  return Array.from({ length: count }, (_, index) => poseFrame(startMs + index * 40, overrides));
}

/**
 * A recording of the right wrist sweeping sideways — the shape of a real dynamic movement, with
 * every other joint held still so the motion profile has an unambiguous mover.
 */
export function wavingPoseFrames(count: number, startMs = 0, sweep = 0.4) {
  const step = sweep / Math.max(1, count - 1);
  return Array.from({ length: count }, (_, index) =>
    poseFrame(startMs + index * 40, { 16: { x: NEUTRAL_BODY[16].x + step * index } }),
  );
}

/** A camera the test drives by hand, so frames arrive exactly when a case wants them to. */
export function createFrameSourceStub() {
  const listeners = new Set<(frame: PoseFrame) => void>();

  return {
    source: {
      subscribeFrames(listener) {
        listeners.add(listener);
        return () => listeners.delete(listener);
      },
    } satisfies PoseFrameSource,
    emit: (...frames: PoseFrame[]) => {
      for (const frame of frames) listeners.forEach((listener) => listener(frame));
    },
    get subscriberCount() {
      return listeners.size;
    },
  };
}

/** Hides every joint except the named ones, dropping the frame below the usable-landmark floor. */
export function hideAllBut(...visible: TrackedLandmark[]): PoseOverrides {
  return Object.fromEntries(
    TRACKED_LANDMARKS.filter((index) => !visible.includes(index)).map((index) => [
      index,
      { visibility: 0 },
    ]),
  );
}
