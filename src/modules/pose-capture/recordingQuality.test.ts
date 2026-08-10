import { describe, expect, it } from "vitest";
import { analyseRecordingQuality } from "./analysis";
import { hideAllBut, poseFrame, stillPoseFrames, wavingPoseFrames } from "./testPoses";

/** Enough clean frames to prepare a recognition plan from, with an unmistakable movement. */
const cleanWave = wavingPoseFrames(30);

/**
 * The patient drifts out of shot part-way through, leaving just enough usable frames. Some
 * frames keep only the shoulders; in others the camera loses the torso entirely.
 */
const partlyOutOfShot = [
  ...wavingPoseFrames(26),
  ...Array.from({ length: 7 }, (_, index) => poseFrame(1040 + index * 40, hideAllBut(11, 12))),
  ...Array.from({ length: 7 }, (_, index) => poseFrame(1320 + index * 40, hideAllBut(25, 26))),
];

describe("analyseRecordingQuality", () => {
  it("passes a clean recording whose selection covers the movement", () => {
    const quality = analyseRecordingQuality(cleanWave, [16]);

    expect(quality.status).toBe("good");
    expect(quality.issues).toEqual([]);
    expect(quality.totalFrames).toBe(30);
    expect(quality.usableFrames).toBe(30);
    expect(quality.usableFramePercentage).toBe(1);
    expect(quality.jointVisibility[16]).toBe(1);
  });

  it("passes a held pose, which has no movement for a selection to miss", () => {
    expect(analyseRecordingQuality(stillPoseFrames(30), [25]).status).toBe("good");
  });

  it("rejects a recording the camera captured nothing in", () => {
    const quality = analyseRecordingQuality([], [16]);

    expect(quality.status).toBe("unusable");
    expect(quality.issues).toEqual(["no_pose_frames"]);
    expect(quality.usableFramePercentage).toBe(0);
    expect(quality.jointVisibility[16]).toBe(0);
  });

  it("rejects a recording too short to build a recognition plan from", () => {
    const quality = analyseRecordingQuality(wavingPoseFrames(10), [16]);

    expect(quality.status).toBe("unusable");
    expect(quality.issues).toEqual(["insufficient_usable_frames"]);
  });

  /** Usable, but the patient left shot often enough that the clinician should be warned. */
  it("warns when the patient was in shot for too little of the recording", () => {
    const quality = analyseRecordingQuality(partlyOutOfShot, [16]);

    expect(quality.status).toBe("warning");
    expect(quality.issues).toEqual(["low_usable_frame_coverage"]);
    expect(quality.usableFrames).toBe(26);
    expect(quality.usableFramePercentage).toBe(0.65);
    expect(quality.jointVisibility[16]).toBe(0.65);
  });

  it("rejects a recording with no joints selected", () => {
    const quality = analyseRecordingQuality(cleanWave);

    expect(quality.status).toBe("unusable");
    expect(quality.issues).toEqual(["no_landmarks_selected"]);
  });

  /** The wrist did the moving, so a legs-only selection would recognise nothing. */
  it("rejects a selection that misses where the movement happened", () => {
    const quality = analyseRecordingQuality(cleanWave, [25, 26]);

    expect(quality.status).toBe("unusable");
    expect(quality.issues).toEqual(["selection_misses_movement"]);
  });

  it("reports every problem a recording has at once", () => {
    expect(analyseRecordingQuality(wavingPoseFrames(10)).issues).toEqual([
      "insufficient_usable_frames",
      "no_landmarks_selected",
    ]);
  });

  it("reports how often each joint was in shot", () => {
    const frames = [
      ...wavingPoseFrames(15),
      ...Array.from({ length: 15 }, (_, index) =>
        poseFrame(600 + index * 40, { 16: { visibility: 0.4 } }),
      ),
    ];

    const quality = analyseRecordingQuality(frames, [16]);

    expect(quality.jointVisibility[16]).toBe(0.5);
    expect(quality.jointVisibility[11]).toBe(1);
  });
});
