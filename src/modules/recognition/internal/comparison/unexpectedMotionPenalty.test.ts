import { describe, expect, it } from "vitest";
import {
  TRACKED_LANDMARKS,
  normalizePoseFrames,
  type PoseFrame,
  type TrackedLandmark,
} from "@/modules/pose-capture";
import { poseFrame, stillPoseFrames, wavingPoseFrames } from "@/modules/pose-capture/testPoses";
import { evenWeights } from "../../testPlans";
import { landmarkSpread } from "../landmarkStatistics";
import { unexpectedMotionPenalty } from "./unexpectedMotionPenalty";

const ALL: TrackedLandmark[] = [...TRACKED_LANDMARKS];
const held = normalizePoseFrames(stillPoseFrames(24));
const waved = normalizePoseFrames(wavingPoseFrames(24));

/** Both wrists swinging, so two joints carry unexpected motion rather than one. */
const bothWrists = normalizePoseFrames(
  Array.from({ length: 24 }, (_, index): PoseFrame => {
    const step = (0.4 * index) / 23;
    return poseFrame(index * 40, { 15: { x: 0.36 - step }, 16: { x: 0.64 + step } });
  }),
);

describe("unexpectedMotionPenalty", () => {
  it("finds nothing to penalise when the patient is as still as the recording", () => {
    expect(unexpectedMotionPenalty(held, held, evenWeights(), ALL)).toBe(0);
  });

  it("penalises a joint the recording held still but the patient moved", () => {
    const penalty = unexpectedMotionPenalty(held, waved, evenWeights(), ALL);

    expect(penalty).toBeCloseTo(landmarkSpread(waved, 16) - 0.08);
  });

  it("averages the two worst offenders rather than every stray joint", () => {
    const penalty = unexpectedMotionPenalty(held, bothWrists, evenWeights(), ALL);
    const perWrist = landmarkSpread(bothWrists, 16) - 0.08;

    expect(penalty).toBeCloseTo(perWrist);
    expect(penalty).toBeGreaterThan(0);
  });

  /** The joint carrying the movement is expected to move, so its motion is never a penalty. */
  it("ignores the joint the movement is built around", () => {
    const weights = { ...evenWeights(), 16: 10 };

    expect(unexpectedMotionPenalty(held, waved, weights, ALL)).toBe(0);
  });

  it("allows a little drift before it counts as unexpected motion", () => {
    const barelyMoved = normalizePoseFrames(wavingPoseFrames(24, 0, 0.05));

    expect(unexpectedMotionPenalty(held, barelyMoved, evenWeights(), ALL)).toBe(0);
  });

  it("only judges the joints the movement watches", () => {
    expect(unexpectedMotionPenalty(held, waved, evenWeights(), [11, 12])).toBe(0);
  });
});
