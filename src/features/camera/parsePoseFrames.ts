import type { PoseFrame } from "./poseFrame";

export function parsePoseFrames(value: string | null): PoseFrame[] {
  if (!value) return [];

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? (parsed as PoseFrame[]) : [];
  } catch {
    return [];
  }
}
