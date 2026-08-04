import { MINIMUM_CONFIDENCE_MARGIN } from "./recognitionConfig";
import type { RecognitionMatch } from "../types";

export function selectAcceptedMatch(matches: RecognitionMatch[], defaultPoseConfidence = 0) {
  const bestMatch = matches[0];
  if (!bestMatch || bestMatch.confidence < bestMatch.keypressTriggerThreshold) {
    return null;
  }

  const competingConfidence = Math.max(matches[1]?.confidence ?? 0, defaultPoseConfidence);
  if (bestMatch.confidence - competingConfidence < MINIMUM_CONFIDENCE_MARGIN) {
    return null;
  }

  return bestMatch;
}
