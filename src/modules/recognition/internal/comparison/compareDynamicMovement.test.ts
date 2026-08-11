import { describe, expect, it } from "vitest";
import {
  TRACKED_LANDMARKS,
  createPoseMotionProfile,
  normalizePoseFrames,
  type PoseFrame,
  type TrackedLandmark,
} from "@/modules/pose-capture";
import {
  hideAllBut,
  poseFrame,
  stillPoseFrames,
  wavingPoseFrames,
} from "@/modules/pose-capture/testPoses";
import { evenWeights } from "../../testPlans";
import { compareDynamicMovement } from "./compareDynamicMovement";

const ALL: TrackedLandmark[] = [...TRACKED_LANDMARKS];
const wristSweep = normalizePoseFrames(wavingPoseFrames(30));
const wristWeights = createPoseMotionProfile(wristSweep, ALL).landmarkWeights;

/** The same take, but the patient's knee wanders while the wrist does the work. */
const wristSweepWithWanderingKnee = normalizePoseFrames(
  Array.from({ length: 30 }, (_, index): PoseFrame => {
    const step = index / 29;
    return poseFrame(index * 40, { 16: { x: 0.64 + 0.4 * step }, 26: { x: 0.55 + 0.2 * step } });
  }),
);

const compare = (live: typeof wristSweep, active: TrackedLandmark[] = ALL) =>
  compareDynamicMovement(wristSweep, live, wristWeights, active);

describe("compareDynamicMovement", () => {
  it("is fully confident when the patient repeats the recorded movement", () => {
    expect(compare(normalizePoseFrames(wavingPoseFrames(30)))).toBe(1);
  });

  it("is unconvinced by a different limb doing the moving", () => {
    const kneeSweep = normalizePoseFrames(
      Array.from(
        { length: 30 },
        (_, index): PoseFrame => poseFrame(index * 40, { 26: { x: 0.55 + (0.4 * index) / 29 } }),
      ),
    );

    expect(compare(kneeSweep)).toBeLessThan(0.7);
  });

  it("is unconvinced by the patient standing still", () => {
    expect(compare(normalizePoseFrames(stillPoseFrames(30)))).toBeLessThan(0.8);
  });

  /** Same wrist path, but a joint the recording held still is wandering as well. */
  it("marks a movement down for motion the recording did not have", () => {
    expect(compare(wristSweepWithWanderingKnee)).toBeLessThan(compare(wristSweep));
  });

  it("is not confident when the patient is not in shot", () => {
    expect(compare([])).toBe(0);
  });

  it("is not confident when there is no recorded movement to compare against", () => {
    expect(compareDynamicMovement([], wristSweep, evenWeights(), ALL)).toBe(0);
  });

  it("is not confident from a single frame, which has no movement in it", () => {
    expect(compare(normalizePoseFrames([poseFrame(0)]))).toBe(0);
  });

  /** Frames captured in one instant cannot be stretched into a movement. */
  it("is not confident when every frame shares a timestamp", () => {
    const frozen = normalizePoseFrames(Array.from({ length: 10 }, () => poseFrame(0)));

    expect(compare(frozen)).toBe(0);
  });

  it("is not confident when none of the watched joints are in shot", () => {
    const torsoOnly = normalizePoseFrames(
      Array.from({ length: 30 }, (_, index) =>
        poseFrame(index * 40, hideAllBut(11, 12, 23, 24, 25, 26)),
      ),
    );

    expect(compare(torsoOnly, [13, 14, 15, 16, 27, 28])).toBe(0);
  });

  it("judges a narrow selection on those joints alone", () => {
    expect(compare(normalizePoseFrames(wavingPoseFrames(30)), [15, 16])).toBe(1);
  });
});
