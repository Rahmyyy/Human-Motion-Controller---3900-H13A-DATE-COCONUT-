import { CONFIDENCE_THRESHOLD, MINIMUM_CONFIDENCE_MARGIN, type RecognitionMatch } from "./types";

export function selectAcceptedMatch(matches: RecognitionMatch[]) {
  const bestMatch = matches[0];
  if (!bestMatch || bestMatch.confidence < CONFIDENCE_THRESHOLD) {
    return null;
  }

  const secondBestMatch = matches[1];
  if (
    secondBestMatch &&
    bestMatch.confidence - secondBestMatch.confidence < MINIMUM_CONFIDENCE_MARGIN
  ) {
    return null;
  }

  return bestMatch;
}
