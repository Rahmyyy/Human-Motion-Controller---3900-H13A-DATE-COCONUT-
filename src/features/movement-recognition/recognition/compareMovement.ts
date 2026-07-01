import {
  MIN_VISIBLE_LANDMARKS,
  RECOGNITION_FRAME_COUNT,
  TRACKED_LANDMARKS,
  type NormalizedPoseFrame,
} from "./types";
import { resampleFrames } from "./resampleFrames";

export function compareMovement(
  templateFrames: NormalizedPoseFrame[],
  liveFrames: NormalizedPoseFrame[],
) {
  const template = resampleFrames(validFrames(templateFrames), RECOGNITION_FRAME_COUNT);
  const live = resampleFrames(validFrames(liveFrames), RECOGNITION_FRAME_COUNT);

  if (template.length !== RECOGNITION_FRAME_COUNT || live.length !== RECOGNITION_FRAME_COUNT) {
    return 0;
  }

  let totalDistance = 0;
  let comparedPoints = 0;

  for (let frameIndex = 0; frameIndex < RECOGNITION_FRAME_COUNT; frameIndex += 1) {
    const frameDistance = compareFrame(template[frameIndex], live[frameIndex]);
    if (!frameDistance) {
      continue;
    }

    totalDistance += frameDistance.distance;
    comparedPoints += frameDistance.count;
  }

  if (comparedPoints === 0) {
    return 0;
  }

  return distanceToConfidence(totalDistance / comparedPoints);
}

function validFrames(frames: NormalizedPoseFrame[]) {
  return frames.filter((frame) => frame.visibleCount >= MIN_VISIBLE_LANDMARKS);
}

function compareFrame(template: NormalizedPoseFrame, live: NormalizedPoseFrame) {
  let distance = 0;
  let count = 0;

  for (const landmark of TRACKED_LANDMARKS) {
    const templatePoint = template.landmarks[landmark];
    const livePoint = live.landmarks[landmark];

    if (!templatePoint || !livePoint) {
      continue;
    }

    distance += Math.hypot(templatePoint.x - livePoint.x, templatePoint.y - livePoint.y);
    count += 1;
  }

  if (count < MIN_VISIBLE_LANDMARKS) {
    return null;
  }

  return { count, distance };
}

function distanceToConfidence(distance: number) {
  return 1 / (1 + distance);
}
