import type { PoseFrame } from "@/features/camera/poseFrame";
import {
  normalizePoseFrame,
  normalizePoseFrames,
} from "@/features/movement-recognition/recognition/normalizePose";
import { isVisible } from "@/features/movement-recognition/recognition/poseGeometry";
import {
  MIN_VISIBLE_LANDMARKS,
  RECOGNITION_FRAME_COUNT,
} from "@/features/movement-recognition/recognition/recognitionConfig";
import { createMovementProfile } from "@/features/movement-recognition/recognition/template/createMovementProfile";
import { trimLeadingIdleFrames } from "@/features/movement-recognition/recognition/template/trimLeadingIdleFrames";
import {
  resolveActiveLandmarks,
  TRACKED_LANDMARKS,
  type TrackedLandmark,
} from "@/features/movement-recognition/recognition/types";

export const GOOD_USABLE_FRAME_PERCENTAGE = 0.7;

export type RecordingQualityStatus = "good" | "warning" | "unusable";

export type RecordingQualityIssue =
  | "no_pose_frames"
  | "insufficient_usable_frames"
  | "low_usable_frame_coverage"
  | "selection_misses_movement";

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
export function analyseRecordingQuality(
  frames: PoseFrame[],
  selectedLandmarks: number[] = [],
): RecordingQuality {
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
  const selectionMissesMovement = detectSelectionMissesMovement(frames, selectedLandmarks);
  const issues: RecordingQualityIssue[] = [];

  if (totalFrames === 0) {
    issues.push("no_pose_frames");
  } else if (usableFrames < RECOGNITION_FRAME_COUNT) {
    issues.push("insufficient_usable_frames");
  } else if (usableFramePercentage < GOOD_USABLE_FRAME_PERCENTAGE) {
    issues.push("low_usable_frame_coverage");
  }

  if (selectionMissesMovement) {
    issues.push("selection_misses_movement");
  }

  return {
    status: qualityStatus(usableFrames, usableFramePercentage, selectionMissesMovement),
    totalFrames,
    usableFrames,
    usableFramePercentage,
    jointVisibility,
    issues,
  };
}

/**
 * True when the recording clearly contains a movement, but the user's selected landmarks don't
 * capture it — either nothing is selected, or the chosen joints stay still through the motion
 * (e.g. a left-arm raise with only the right arm selected). Reuses recognition's own dynamic/static
 * classification so the check matches how the matcher would treat the template. A genuinely static
 * recording (a held pose) has no movement to miss, so it is never flagged.
 */
function detectSelectionMissesMovement(frames: PoseFrame[], selectedLandmarks: number[]): boolean {
  const movementFrames = trimLeadingIdleFrames(normalizePoseFrames(frames));
  if (movementFrames.length < 2) {
    return false;
  }

  const recordingIsDynamic = createMovementProfile(movementFrames, [
    ...TRACKED_LANDMARKS,
  ]).isDynamic;
  if (!recordingIsDynamic) {
    return false;
  }

  // A moving recording with nothing selected has no joints tracking the movement at all.
  if (selectedLandmarks.length === 0) {
    return true;
  }

  const selectionIsDynamic = createMovementProfile(
    movementFrames,
    resolveActiveLandmarks(selectedLandmarks),
  ).isDynamic;
  return !selectionIsDynamic;
}

/**
 * Applies the same normalization and minimum-landmark rules as recognition so
 * the quality result cannot mark a frame usable when the matcher would reject it.
 */
function isMatcherUsableFrame(frame: PoseFrame) {
  const normalizedFrame = normalizePoseFrame(frame);
  return Boolean(normalizedFrame && normalizedFrame.visibleCount >= MIN_VISIBLE_LANDMARKS);
}

/** Classifies a recording from its usable-frame count, overall coverage, and landmark selection. */
function qualityStatus(
  usableFrames: number,
  usableFramePercentage: number,
  selectionMissesMovement: boolean,
): RecordingQualityStatus {
  if (usableFrames < RECOGNITION_FRAME_COUNT || selectionMissesMovement) {
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
