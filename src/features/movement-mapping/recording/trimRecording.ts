import type { PoseFrame } from "@/features/camera/poseFrame";

export type RecordingTrimRange = {
  durationMs: number;
  startMs: number;
  endMs: number;
};

export function createRecordingTrimRange(frames: PoseFrame[]): RecordingTrimRange | null {
  const firstFrame = frames[0];
  const lastFrame = frames[frames.length - 1];
  if (!firstFrame || !lastFrame) return null;

  const durationMs = Math.max(0, lastFrame.timestampMs - firstFrame.timestampMs);
  if (durationMs === 0) return null;

  return {
    durationMs,
    startMs: 0,
    endMs: durationMs,
  };
}

export function constrainRecordingTrimRange(
  range: RecordingTrimRange,
  durationMs: number,
): RecordingTrimRange {
  const constrainedDurationMs = Math.max(0, durationMs);
  const startMs = clamp(range.startMs, 0, constrainedDurationMs);
  const endMs = clamp(range.endMs, startMs, constrainedDurationMs);

  return {
    durationMs: constrainedDurationMs,
    startMs,
    endMs,
  };
}

export function trimRecordingFrames(frames: PoseFrame[], range: RecordingTrimRange) {
  const firstFrame = frames[0];
  if (!firstFrame) return [];

  return frames.filter((frame) => {
    const offsetMs = frame.timestampMs - firstFrame.timestampMs;
    return offsetMs >= range.startMs && offsetMs <= range.endMs;
  });
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}
