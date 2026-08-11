import { describe, expect, it } from "vitest";
import {
  TRACKED_LANDMARKS,
  normalizePoseFrames,
  type TrackedLandmark,
} from "@/modules/pose-capture";
import { hideAllBut, poseFrame, stillPoseFrames } from "@/modules/pose-capture/testPoses";
import { compareStaticPose } from "./compareStaticPose";
import { distanceToConfidence } from "./confidence";

const ALL: TrackedLandmark[] = [...TRACKED_LANDMARKS];

/** The recorded pose the patient is being compared against. */
const template = normalizePoseFrames(stillPoseFrames(10));

/** Both wrists held a tenth of a torso-length out from where they were recorded. */
const wristsOut = normalizePoseFrames([poseFrame(0, { 15: { x: 0.32 }, 16: { x: 0.68 } })]);

describe("compareStaticPose", () => {
  it("is fully confident when the patient holds the recorded pose", () => {
    expect(compareStaticPose(template, normalizePoseFrames(stillPoseFrames(3)), ALL)).toBe(1);
  });

  /** Only the four worst joints count, so two wrists out by 0.1 average out to 0.05. */
  it("loses confidence in proportion to the worst joints' error", () => {
    expect(compareStaticPose(template, wristsOut, ALL)).toBeCloseTo(1 / 1.05);
  });

  it("compares against the latest frame the patient is in", () => {
    const live = normalizePoseFrames([
      poseFrame(0, { 15: { x: 0.32 }, 16: { x: 0.68 } }),
      poseFrame(40),
    ]);

    expect(compareStaticPose(template, live, ALL)).toBe(1);
  });

  it("judges a narrow selection on those joints alone", () => {
    expect(compareStaticPose(template, wristsOut, [15, 16])).toBeCloseTo(1 / 1.1);
  });

  it("is not confident when there is no recorded pose to compare against", () => {
    expect(compareStaticPose([], wristsOut, ALL)).toBe(0);
  });

  it("is not confident when the patient is not in shot", () => {
    expect(compareStaticPose(template, [], ALL)).toBe(0);
  });

  it("is not confident when the recording never showed enough of the patient", () => {
    const tooLittle = normalizePoseFrames(stillPoseFrames(10, 0, hideAllBut(11, 12)));

    expect(compareStaticPose(tooLittle, wristsOut, ALL)).toBe(0);
  });

  /** The patient is in shot, but almost none of the joints this movement watches are. */
  it("is not confident when too few of the watched joints can be seen", () => {
    const legsOnly = normalizePoseFrames([poseFrame(0, hideAllBut(11, 12, 23, 24, 25, 26, 27))]);

    expect(compareStaticPose(template, legsOnly, [13, 14, 15, 16, 27, 28])).toBe(0);
  });
});

describe("distanceToConfidence", () => {
  it("reads a perfect match as full confidence", () => {
    expect(distanceToConfidence(0)).toBe(1);
  });

  it("falls away as the pose drifts further from the recording", () => {
    expect(distanceToConfidence(1)).toBe(0.5);
    expect(distanceToConfidence(3)).toBe(0.25);
  });
});
