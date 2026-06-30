import { compareMovement } from "./compareMovement";
import {
  LIVE_BUFFER_MS,
  type NormalizedPoseFrame,
  type PreparedMovementTemplate,
  type RecognitionMatch,
} from "./types";

const MIN_TEMPLATE_WINDOW_MS = 700;

export function trimLiveBuffer(frames: NormalizedPoseFrame[], nowMs: number) {
  const cutoffMs = nowMs - LIVE_BUFFER_MS;
  return frames.filter((frame) => frame.timestampMs >= cutoffMs);
}

export function findBestTemplateMatch(
  templates: PreparedMovementTemplate[],
  liveFrames: NormalizedPoseFrame[],
): RecognitionMatch | null {
  let bestMatch: RecognitionMatch | null = null;

  for (const template of templates) {
    const liveWindow = liveWindowForTemplate(liveFrames, template.durationMs);
    const confidence = compareMovement(template.frames, liveWindow);

    if (!bestMatch || confidence > bestMatch.confidence) {
      bestMatch = {
        id: template.id,
        name: template.name,
        keybind: template.keybind,
        confidence,
      };
    }
  }

  return bestMatch;
}

function liveWindowForTemplate(frames: NormalizedPoseFrame[], templateDurationMs: number) {
  const lastFrame = frames[frames.length - 1];
  if (!lastFrame) {
    return [];
  }

  const windowMs = clamp(templateDurationMs, MIN_TEMPLATE_WINDOW_MS, LIVE_BUFFER_MS);
  const startMs = lastFrame.timestampMs - windowMs;
  return frames.filter((frame) => frame.timestampMs >= startMs);
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}
