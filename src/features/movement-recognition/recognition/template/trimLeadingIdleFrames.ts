import {
  MOVEMENT_ONSET_DISTANCE,
  MOVEMENT_ONSET_PADDING_FRAMES,
  ONSET_REFERENCE_FRAMES,
} from "../recognitionConfig";
import { landmarkCenter, trackedLandmarkRecord } from "../landmarkStatistics";
import { TRACKED_LANDMARKS, type NormalizedPoseFrame } from "../types";

export function trimLeadingIdleFrames(frames: NormalizedPoseFrame[]) {
  if (frames.length <= ONSET_REFERENCE_FRAMES) return frames;

  const referenceFrames = frames.slice(0, ONSET_REFERENCE_FRAMES);
  const referencePose = trackedLandmarkRecord((landmark) =>
    landmarkCenter(referenceFrames, landmark),
  );
  const onsetIndex = frames.findIndex((frame) =>
    TRACKED_LANDMARKS.some((landmark) => {
      const referencePoint = referencePose[landmark];
      const point = frame.landmarks[landmark];
      return (
        referencePoint &&
        point &&
        Math.hypot(point.x - referencePoint.x, point.y - referencePoint.y) >=
          MOVEMENT_ONSET_DISTANCE
      );
    }),
  );

  if (onsetIndex < 0) return frames;
  return frames.slice(Math.max(0, onsetIndex - MOVEMENT_ONSET_PADDING_FRAMES));
}
