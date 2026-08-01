import { compareMovement } from "./compareMovement";
import { LIVE_BUFFER_MS, MIN_TEMPLATE_WINDOW_MS } from "./recognitionConfig";
import {
  type NormalizedPoseFrame,
  type PreparedMovementTemplate,
  type RecognitionMatch,
} from "./types";

export function trimLiveBuffer(frames: NormalizedPoseFrame[], nowMs: number) {
  const cutoffMs = nowMs - LIVE_BUFFER_MS;
  return frames.filter((frame) => frame.timestampMs >= cutoffMs);
}

export function findBestTemplateMatch(
  templates: PreparedMovementTemplate[],
  liveFrames: NormalizedPoseFrame[],
): RecognitionMatch | null {
  return findTemplateMatches(templates, liveFrames)[0] ?? null;
}

export function findTemplateMatches(
  templates: PreparedMovementTemplate[],
  liveFrames: NormalizedPoseFrame[],
): RecognitionMatch[] {
  let bestMatch: RecognitionMatch | null = null;
  const matches: RecognitionMatch[] = [];

  for (const template of templates) {
    const liveWindow = liveWindowForTemplate(liveFrames, template.durationMs);
    const confidence = compareMovement(
      template.frames,
      liveWindow,
      template.landmarkWeights,
      template.isDynamic,
      template.activeLandmarks,
    );
    const match = {
      id: template.id,
      name: template.name,
      keybind: template.keybind,
      confidence,
      keypressTriggerThreshold: template.keypressTriggerThreshold,
    };

    matches.push(match);

    if (!bestMatch || confidence > bestMatch.confidence) {
      bestMatch = match;
    }
  }

  return matches.sort((first, second) => second.confidence - first.confidence);
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
