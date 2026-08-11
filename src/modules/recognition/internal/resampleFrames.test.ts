import { describe, expect, it } from "vitest";
import { resampleFrames } from "./resampleFrames";

const at = (timestampMs: number) => ({ timestampMs });
const timestamps = (frames: Array<{ timestampMs: number }>) =>
  frames.map((frame) => frame.timestampMs);

describe("resampleFrames", () => {
  it("picks the frames nearest to evenly spaced points across the recording", () => {
    const frames = [at(0), at(100), at(200), at(300), at(400)];

    expect(timestamps(resampleFrames(frames, 3))).toEqual([0, 200, 400]);
  });

  it("always keeps the first and last frame of the recording", () => {
    const resampled = resampleFrames([at(0), at(10), at(20), at(1000)], 2);

    expect(timestamps(resampled)).toEqual([0, 1000]);
  });

  it("picks the nearest frame even when the recording has none close by", () => {
    const resampled = resampleFrames([at(0), at(10), at(20), at(1000)], 3);

    expect(timestamps(resampled)).toEqual([0, 20, 1000]);
  });

  /** A sparse recording repeats frames rather than falling short of the requested count. */
  it("stretches a short recording up to the requested count", () => {
    expect(timestamps(resampleFrames([at(0), at(1000)], 4))).toEqual([0, 0, 1000, 1000]);
  });

  it("sorts frames that arrived out of order before sampling", () => {
    const resampled = resampleFrames([at(400), at(0), at(200)], 3);

    expect(timestamps(resampled)).toEqual([0, 200, 400]);
  });

  it("has nothing to sample from an empty recording", () => {
    expect(resampleFrames([], 24)).toEqual([]);
  });

  it("has nothing to sample when no frames are asked for", () => {
    expect(resampleFrames([at(0), at(100)], 0)).toEqual([]);
    expect(resampleFrames([at(0), at(100)], -1)).toEqual([]);
  });

  it("samples a single-frame recording as that one frame", () => {
    expect(timestamps(resampleFrames([at(40)], 24))).toEqual([40]);
  });

  it("samples the first frame when only one is asked for", () => {
    expect(timestamps(resampleFrames([at(0), at(100)], 1))).toEqual([0]);
  });

  describe("frames that all share one timestamp", () => {
    const sameInstant = [at(5), at(5), at(5), at(5), at(5)];

    it("keeps them all when no more are asked for than exist", () => {
      expect(resampleFrames(sameInstant.slice(0, 3), 5)).toHaveLength(3);
    });

    it("spreads the pick evenly by position when more exist than are asked for", () => {
      const labelled = sameInstant.map((frame, index) => ({ ...frame, index }));

      expect(resampleFrames(labelled, 3).map((frame) => frame.index)).toEqual([0, 2, 4]);
    });
  });
});
