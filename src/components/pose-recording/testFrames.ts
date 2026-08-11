import type { PoseFrame, PoseLandmark } from "@/modules/pose-capture";

/** A frame carries a single landmark; the tests identify frames by timestamp, not by pose. */
export function frame(timestampMs: number, overrides: Partial<PoseLandmark> = {}): PoseFrame {
  return {
    timestampMs,
    landmarks: [{ index: 11, x: 0.5, y: 0.5, z: 0, visibility: 0.9, ...overrides }],
  };
}

export function frames(...timestamps: number[]): PoseFrame[] {
  return timestamps.map((timestampMs) => frame(timestampMs));
}
