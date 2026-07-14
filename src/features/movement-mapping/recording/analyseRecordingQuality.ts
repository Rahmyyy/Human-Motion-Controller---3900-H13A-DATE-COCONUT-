import type { PoseFrame } from "@/features/camera/poseFrame";
import { normalizePoseFrame } from "@/features/movement-recognition/recognition/normalizePose";
import { isVisible } from "@/features/movement-recognition/recognition/poseGeometry";
import {
  MIN_VISIBLE_LANDMARKS,
  RECOGNITION_FRAME_COUNT,
  TRACKED_LANDMARKS,
  type TrackedLandmark,
} from "@/features/movement-recognition/recognition/types";

export const GOOD_USABLE_FRAME_PERCENTAGE = 0.7;

export type RecordingQualityStatus = "good" | "warning" | "unusable";

export type RecordingQualityIssue =
  | "no_pose_frames"
  | "insufficient_usable_frames"
  | "low_usable_frame_coverage";

export type RecordingQuality = {
  status: RecordingQualityStatus;
  totalFrames: number;
  usableFrames: number;
  usableFramePercentage: number;
  jointVisibility: Record<TrackedLandmark, number>;
  issues: RecordingQualityIssue[];
};

/**
 * Summarises whether a recorded PoseFrame sequence contains enough visible,
 * normalisable landmarks for the current movement matcher to use.
 *
 * This does not alter the recording or recognition behaviour. The returned
 * per-joint visibility values are intended to support later adaptive joint
 * selection as well as the current post-recording quality UI.
 */
export function analyseRecordingQuality(frames: PoseFrame[]): RecordingQuality {
  const visibleFrameCounts = trackedLandmarkRecord(() => 0);

  for (const frame of frames) {
    const landmarks = new Map(frame.landmarks.map((landmark) => [landmark.index, landmark]));

    for (const index of TRACKED_LANDMARKS) {
      if (isVisible(landmarks.get(index))) {
        visibleFrameCounts[index] += 1;
      }
    }
  }

  const totalFrames = frames.length;
  const usableFrames = frames.filter(isMatcherUsableFrame).length;
  const usableFramePercentage = totalFrames === 0 ? 0 : usableFrames / totalFrames;
  const jointVisibility = trackedLandmarkRecord((index) =>
    totalFrames === 0 ? 0 : visibleFrameCounts[index] / totalFrames,
  );
  const issues: RecordingQualityIssue[] = [];

  if (totalFrames === 0) {
    issues.push("no_pose_frames");
  } else if (usableFrames < RECOGNITION_FRAME_COUNT) {
    issues.push("insufficient_usable_frames");
  } else if (usableFramePercentage < GOOD_USABLE_FRAME_PERCENTAGE) {
    issues.push("low_usable_frame_coverage");
  }

  return {
    status: qualityStatus(usableFrames, usableFramePercentage),
    totalFrames,
    usableFrames,
    usableFramePercentage,
    jointVisibility,
    issues,
  };
}

/**
 * Applies the same normalization and minimum-landmark rules as recognition so
 * the quality result cannot mark a frame usable when the matcher would reject it.
 */
function isMatcherUsableFrame(frame: PoseFrame) {
  const normalizedFrame = normalizePoseFrame(frame);
  return Boolean(normalizedFrame && normalizedFrame.visibleCount >= MIN_VISIBLE_LANDMARKS);
}

/** Classifies a recording from its usable-frame count and overall coverage. */
function qualityStatus(
  usableFrames: number,
  usableFramePercentage: number,
): RecordingQualityStatus {
  if (usableFrames < RECOGNITION_FRAME_COUNT) {
    return "unusable";
  }

  return usableFramePercentage < GOOD_USABLE_FRAME_PERCENTAGE ? "warning" : "good";
}

/** Creates a fully populated record with one value for every tracked landmark. */
function trackedLandmarkRecord<T>(createValue: (index: TrackedLandmark) => T) {
  return Object.fromEntries(
    TRACKED_LANDMARKS.map((index) => [index, createValue(index)]),
  ) as Record<TrackedLandmark, T>;
}
