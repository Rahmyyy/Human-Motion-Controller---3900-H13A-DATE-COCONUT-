import { describe, expect, it } from "vitest";
import { createPoseMotionProfile, normalizePoseFrames, trimLeadingIdleFrames } from "./analysis";
import { TRACKED_LANDMARKS } from "./domain";
import { poseFrame, stillPoseFrames, wavingPoseFrames } from "./testPoses";

/** Eight frames of the patient settling, then eight of the right wrist moving out. */
const delayedWave = [
  ...stillPoseFrames(8),
  ...Array.from({ length: 8 }, (_, index) =>
    poseFrame(320 + index * 40, { 16: { x: 0.64 + 0.05 * (index + 1) } }),
  ),
];

const normalized = (frames: ReturnType<typeof stillPoseFrames>) => normalizePoseFrames(frames);

describe("trimLeadingIdleFrames", () => {
  it("drops the idle lead-in, keeping a couple of frames before the movement starts", () => {
    const trimmed = trimLeadingIdleFrames(normalized(delayedWave));

    expect(trimmed[0]?.timestampMs).toBe(240);
    expect(trimmed).toHaveLength(10);
  });

  it("keeps a recording that moves from its very first frame", () => {
    const frames = normalized(wavingPoseFrames(20));

    expect(trimLeadingIdleFrames(frames)).toHaveLength(20);
  });

  it("keeps a recording of the patient holding still, having nothing to trim to", () => {
    const frames = normalized(stillPoseFrames(20));

    expect(trimLeadingIdleFrames(frames)).toBe(frames);
  });

  /** Too short to establish a resting reference, so the recording is taken as-is. */
  it("keeps a recording shorter than the reference window", () => {
    const frames = normalized(stillPoseFrames(5));

    expect(trimLeadingIdleFrames(frames)).toBe(frames);
  });
});

describe("createPoseMotionProfile", () => {
  it("reads a held pose as static and weighs its joints equally", () => {
    const profile = createPoseMotionProfile(normalized(stillPoseFrames(24)), [
      ...TRACKED_LANDMARKS,
    ]);

    expect(profile.isDynamic).toBe(false);
    expect(profile.landmarkWeights[16]).toBe(1);
    expect(profile.landmarkWeights[11]).toBe(1);
  });

  it("weighs only the selected joints of a held pose", () => {
    const profile = createPoseMotionProfile(normalized(stillPoseFrames(24)), [15, 16]);

    expect(profile.landmarkWeights[16]).toBe(1);
    expect(profile.landmarkWeights[11]).toBe(0);
  });

  it("reads a swept limb as dynamic", () => {
    const profile = createPoseMotionProfile(normalized(wavingPoseFrames(24)), [
      ...TRACKED_LANDMARKS,
    ]);

    expect(profile.isDynamic).toBe(true);
  });

  it("gives the moving joint far more say than the ones held still", () => {
    const weights = createPoseMotionProfile(normalized(wavingPoseFrames(24)), [
      ...TRACKED_LANDMARKS,
    ]).landmarkWeights;

    expect(weights[16]).toBeGreaterThan(weights[11] * 50);
  });

  /** Weights average to one, so a movement's confidence stays comparable across selections. */
  it("spreads the same total weight however many joints are selected", () => {
    const all = createPoseMotionProfile(normalized(wavingPoseFrames(24)), [...TRACKED_LANDMARKS]);
    const pair = createPoseMotionProfile(normalized(wavingPoseFrames(24)), [15, 16]);

    expect(total(all.landmarkWeights)).toBeCloseTo(TRACKED_LANDMARKS.length);
    expect(total(pair.landmarkWeights)).toBeCloseTo(2);
  });

  it("reads a movement the selection misses as static", () => {
    const profile = createPoseMotionProfile(normalized(wavingPoseFrames(24)), [25, 26]);

    expect(profile.isDynamic).toBe(false);
  });

  it("reads a recording with no joints selected as static and weighs nothing", () => {
    const profile = createPoseMotionProfile(normalized(wavingPoseFrames(24)), []);

    expect(profile.isDynamic).toBe(false);
    expect(total(profile.landmarkWeights)).toBe(0);
  });

  /** A single frame has no spread to measure, so there is no movement to find. */
  it("reads a one-frame recording as static", () => {
    expect(createPoseMotionProfile(normalized(stillPoseFrames(1)), [16]).isDynamic).toBe(false);
  });
});

function total(weights: Record<number, number>) {
  return Object.values(weights).reduce((sum, weight) => sum + weight, 0);
}
