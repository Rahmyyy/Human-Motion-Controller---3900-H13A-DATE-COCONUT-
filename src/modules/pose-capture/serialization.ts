import type { PoseFrame } from "./domain";

export function parsePoseFrames(value: string | null | undefined): PoseFrame[] {
  if (!value) return [];

  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter(isPoseFrame) : [];
  } catch {
    return [];
  }
}

function isPoseFrame(value: unknown): value is PoseFrame {
  if (!value || typeof value !== "object") return false;
  const frame = value as Partial<PoseFrame>;
  return (
    typeof frame.timestampMs === "number" &&
    Number.isFinite(frame.timestampMs) &&
    Array.isArray(frame.landmarks) &&
    frame.landmarks.every(isPoseLandmark)
  );
}

function isPoseLandmark(value: unknown) {
  if (!value || typeof value !== "object") return false;
  const landmark = value as Record<string, unknown>;
  return ["index", "x", "y", "z", "visibility"].every(
    (key) => typeof landmark[key] === "number" && Number.isFinite(landmark[key]),
  );
}
