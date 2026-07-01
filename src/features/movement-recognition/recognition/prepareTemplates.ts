import type { PoseFrame } from "@/features/camera/poseFrame";
import type { PresetMappingCardData } from "@/features/preset-mapping/types";
import { normalizePoseFrames } from "./normalizePose";
import type { PreparedMovementTemplate } from "./types";

export function prepareMovementTemplates(
  mappings: PresetMappingCardData[],
): PreparedMovementTemplate[] {
  return mappings.flatMap((mapping) => {
    const frames = parsePoseFrames(mapping.poseFramesJson);
    if (frames.length < 2) {
      return [];
    }

    const normalizedFrames = normalizePoseFrames(frames);
    if (normalizedFrames.length < 2) {
      return [];
    }

    return {
      id: mapping.id,
      name: mapping.name,
      keybind: mapping.keybind,
      frames: normalizedFrames,
      durationMs: movementDurationMs(frames),
    };
  });
}

function parsePoseFrames(value: string): PoseFrame[] {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? (parsed as PoseFrame[]) : [];
  } catch {
    return [];
  }
}

function movementDurationMs(frames: PoseFrame[]) {
  const firstFrame = frames[0];
  const lastFrame = frames[frames.length - 1];
  return Math.max(0, lastFrame.timestampMs - firstFrame.timestampMs);
}
