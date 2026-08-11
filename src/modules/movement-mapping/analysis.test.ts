import { describe, expect, it } from "vitest";
import { TRACKED_LANDMARKS } from "@/modules/pose-capture";
import { stillPoseFrames, wavingPoseFrames } from "@/modules/pose-capture/testPoses";
import {
  clamp,
  frameAtMovementThreshold,
  framesAtMovementThreshold,
  keypressTriggerThresholdFromPercentage,
  movementThresholdSettings,
} from "./analysis";

const held = stillPoseFrames(11);
const wave = wavingPoseFrames(30);
const ALL = [...TRACKED_LANDMARKS];
const timestamps = (frames: typeof held) => frames.map((frame) => frame.timestampMs);

describe("framesAtMovementThreshold", () => {
  it("keeps the part of the recording up to the threshold", () => {
    expect(timestamps(framesAtMovementThreshold(held, 50))).toEqual([0, 40, 80, 120, 160, 200]);
  });

  it("keeps the whole recording at the full threshold", () => {
    expect(framesAtMovementThreshold(held, 100)).toHaveLength(held.length);
  });

  it("keeps only the opening frame at a zero threshold", () => {
    expect(timestamps(framesAtMovementThreshold(held, 0))).toEqual([0]);
  });

  it("treats a threshold outside the scale as its nearest end", () => {
    expect(framesAtMovementThreshold(held, 150)).toHaveLength(held.length);
    expect(framesAtMovementThreshold(held, -10)).toHaveLength(1);
  });

  it("has nothing to trim from a recording with no duration", () => {
    expect(framesAtMovementThreshold(stillPoseFrames(1), 50)).toHaveLength(1);
    expect(framesAtMovementThreshold([], 50)).toEqual([]);
  });
});

describe("frameAtMovementThreshold", () => {
  it("shows the pose the movement has reached at the threshold", () => {
    expect(frameAtMovementThreshold(held, 50)?.timestampMs).toBe(200);
  });

  it("shows the opening pose at a zero threshold", () => {
    expect(frameAtMovementThreshold(held, 0)?.timestampMs).toBe(0);
  });

  it("shows the only frame of a recording with no duration", () => {
    expect(frameAtMovementThreshold(stillPoseFrames(1), 50)?.timestampMs).toBe(0);
  });

  it("has no pose to show for an empty recording", () => {
    expect(frameAtMovementThreshold([], 50)).toBeNull();
  });
});

describe("movementThresholdSettings", () => {
  /** Below 80% the trimmed recording no longer has enough frames to recognise from. */
  it("reports the shortest usable part of a recorded movement", () => {
    const settings = movementThresholdSettings(wave, ALL, 100);

    expect(settings?.minimumPercentage).toBe(80);
    expect(settings?.effectivePercentage).toBe(100);
  });

  it("raises a saved threshold that would leave too little to recognise", () => {
    expect(movementThresholdSettings(wave, ALL, 50)?.effectivePercentage).toBe(80);
  });

  it("caps a saved threshold at the full recording", () => {
    expect(movementThresholdSettings(wave, ALL, 150)?.effectivePercentage).toBe(100);
  });

  it("rounds a saved threshold to a whole percentage", () => {
    expect(movementThresholdSettings(wave, ALL, 90.4)?.effectivePercentage).toBe(90);
  });

  /** No selection means no usable trim, so only the whole recording is on offer. */
  it("offers only the whole recording when no joints are selected", () => {
    expect(movementThresholdSettings(wave, [], 50)).toEqual({
      minimumPercentage: 100,
      effectivePercentage: 100,
    });
  });

  /** A held pose has no movement to trim, so there is no threshold to offer. */
  it("offers no threshold for a held pose", () => {
    expect(movementThresholdSettings(stillPoseFrames(30), ALL, 100)).toBeNull();
  });

  it("offers no threshold for a recording too short to hold a movement", () => {
    expect(movementThresholdSettings(stillPoseFrames(1), ALL, 100)).toBeNull();
  });

  it("offers no threshold when the selected joints missed the movement", () => {
    expect(movementThresholdSettings(wave, [25, 26], 100)).toBeNull();
  });
});

describe("keypressTriggerThresholdFromPercentage", () => {
  it("uses the default when the saved value is not a number", () => {
    expect(keypressTriggerThresholdFromPercentage(Number.NaN)).toBe(0.6);
  });

  it("rounds a fractional percentage before converting it", () => {
    expect(keypressTriggerThresholdFromPercentage(74.6)).toBe(0.75);
  });

  it("keeps a percentage that is already in range", () => {
    expect(keypressTriggerThresholdFromPercentage(50)).toBe(0.5);
  });
});

describe("clamp", () => {
  it("holds a value between its bounds", () => {
    expect(clamp(5, 1, 10)).toBe(5);
    expect(clamp(-5, 1, 10)).toBe(1);
    expect(clamp(50, 1, 10)).toBe(10);
  });
});
