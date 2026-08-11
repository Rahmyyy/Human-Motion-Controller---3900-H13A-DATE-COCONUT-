import { describe, expect, it } from "vitest";
import { TRACKED_LANDMARKS, type NormalizedPoseFrame } from "@/modules/pose-capture";
import {
  landmarkCenter,
  landmarkPoints,
  landmarkSpread,
  trackedLandmarkRecord,
  usableFrames,
} from "./landmarkStatistics";

/** A normalized frame stating only the wrist, which is all these statistics read. */
const frame = (timestampMs: number, x: number | null, visibleCount = 12): NormalizedPoseFrame => ({
  timestampMs,
  landmarks: x === null ? {} : { 16: { x, y: 0 } },
  visibleCount,
});

const wristSweep = [frame(0, 0), frame(40, 2)];

describe("landmarkPoints", () => {
  it("collects one point per frame the joint was seen in", () => {
    expect(landmarkPoints(wristSweep, 16)).toEqual([
      { x: 0, y: 0 },
      { x: 2, y: 0 },
    ]);
  });

  it("skips the frames the joint was missing from", () => {
    expect(landmarkPoints([frame(0, 0), frame(40, null)], 16)).toHaveLength(1);
  });

  it("collects nothing for a joint that was never seen", () => {
    expect(landmarkPoints(wristSweep, 11)).toEqual([]);
  });
});

describe("landmarkCenter", () => {
  it("averages where the joint sat across the frames", () => {
    expect(landmarkCenter(wristSweep, 16)).toEqual({ x: 1, y: 0 });
  });

  it("has no centre for a joint that was never seen", () => {
    expect(landmarkCenter(wristSweep, 11)).toBeNull();
  });
});

describe("landmarkSpread", () => {
  it("measures how far the joint strayed from its own centre", () => {
    expect(landmarkSpread(wristSweep, 16)).toBe(1);
  });

  it("reports no spread for a joint seen in only one frame", () => {
    expect(landmarkSpread([frame(0, 0)], 16)).toBe(0);
  });

  it("reports no spread for a joint that was never seen", () => {
    expect(landmarkSpread(wristSweep, 11)).toBe(0);
  });
});

describe("trackedLandmarkRecord", () => {
  it("covers every tracked joint", () => {
    const record = trackedLandmarkRecord(() => 0);

    expect(Object.keys(record).map(Number)).toEqual([...TRACKED_LANDMARKS]);
  });

  it("fills each entry from the joint it belongs to", () => {
    expect(trackedLandmarkRecord((landmark) => landmark * 2)[16]).toBe(32);
  });
});

describe("usableFrames", () => {
  it("keeps the frames that show enough of the patient to compare", () => {
    const frames = [frame(0, 0, 6), frame(40, 0, 12), frame(80, 0, 5)];

    expect(usableFrames(frames).map((usable) => usable.timestampMs)).toEqual([0, 40]);
  });
});
