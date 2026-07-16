import {
  MIN_VISIBLE_LANDMARKS,
  RECOGNITION_FRAME_COUNT,
  TRACKED_LANDMARKS,
  type NormalizedPoseFrame,
  type TrackedLandmark,
} from "./types";
import { resampleFrames } from "./resampleFrames";

const STATIC_POSE_ERROR_LANDMARKS = 4;

export function compareMovement(
  templateFrames: NormalizedPoseFrame[],
  liveFrames: NormalizedPoseFrame[],
  landmarkWeights: Record<TrackedLandmark, number>,
  isDynamic: boolean,
) {
  if (!isDynamic) {
    return compareStaticPose(templateFrames, liveFrames);
  }

  const template = resampleFrames(validFrames(templateFrames), RECOGNITION_FRAME_COUNT);
  const live = resampleFrames(validFrames(liveFrames), RECOGNITION_FRAME_COUNT);

  if (template.length !== RECOGNITION_FRAME_COUNT || live.length !== RECOGNITION_FRAME_COUNT) {
    return 0;
  }

  let totalDistance = 0;
  let comparedWeight = 0;

  for (let frameIndex = 0; frameIndex < RECOGNITION_FRAME_COUNT; frameIndex += 1) {
    const frameDistance = compareFrame(template[frameIndex], live[frameIndex], landmarkWeights);
    if (!frameDistance) {
      continue;
    }

    totalDistance += frameDistance.distance;
    comparedWeight += frameDistance.weight;
  }

  if (comparedWeight === 0) {
    return 0;
  }

  return distanceToConfidence(totalDistance / comparedWeight);
}

function compareStaticPose(
  templateFrames: NormalizedPoseFrame[],
  liveFrames: NormalizedPoseFrame[],
) {
  const usableTemplateFrames = validFrames(templateFrames);
  const usableLiveFrames = validFrames(liveFrames);
  const liveFrame = usableLiveFrames[usableLiveFrames.length - 1];
  if (usableTemplateFrames.length === 0 || !liveFrame) {
    return 0;
  }

  const landmarkDistances: number[] = [];

  for (const landmark of TRACKED_LANDMARKS) {
    const livePoint = liveFrame.landmarks[landmark];
    if (!livePoint) {
      continue;
    }

    const templatePoints = usableTemplateFrames.flatMap((frame) => {
      const point = frame.landmarks[landmark];
      return point ? [point] : [];
    });
    if (templatePoints.length === 0) {
      continue;
    }

    const templatePoint = templatePoints.reduce(
      (total, point) => ({ x: total.x + point.x, y: total.y + point.y }),
      { x: 0, y: 0 },
    );
    templatePoint.x /= templatePoints.length;
    templatePoint.y /= templatePoints.length;

    landmarkDistances.push(
      Math.hypot(templatePoint.x - livePoint.x, templatePoint.y - livePoint.y),
    );
  }

  if (landmarkDistances.length < MIN_VISIBLE_LANDMARKS) {
    return 0;
  }

  const largestErrors = landmarkDistances
    .sort((first, second) => second - first)
    .slice(0, STATIC_POSE_ERROR_LANDMARKS);
  const averageLargestError =
    largestErrors.reduce((total, distance) => total + distance, 0) / largestErrors.length;
  return distanceToConfidence(averageLargestError);
}

function validFrames(frames: NormalizedPoseFrame[]) {
  return frames.filter((frame) => frame.visibleCount >= MIN_VISIBLE_LANDMARKS);
}

function compareFrame(
  template: NormalizedPoseFrame,
  live: NormalizedPoseFrame,
  landmarkWeights: Record<TrackedLandmark, number>,
) {
  let distance = 0;
  let count = 0;
  let weight = 0;

  for (const landmark of TRACKED_LANDMARKS) {
    const templatePoint = template.landmarks[landmark];
    const livePoint = live.landmarks[landmark];

    if (!templatePoint || !livePoint) {
      continue;
    }

    const landmarkWeight = landmarkWeights[landmark];
    distance +=
      Math.hypot(templatePoint.x - livePoint.x, templatePoint.y - livePoint.y) * landmarkWeight;
    count += 1;
    weight += landmarkWeight;
  }

  if (count < MIN_VISIBLE_LANDMARKS) {
    return null;
  }

  return { distance, weight };
}

function distanceToConfidence(distance: number) {
  return 1 / (1 + distance);
}
