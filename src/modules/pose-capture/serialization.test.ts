import { describe, expect, it } from "vitest";
import { parsePoseFrames } from "./serialization";
import { poseFrame } from "./testPoses";

const landmark = { index: 11, x: 0.5, y: 0.5, z: 0, visibility: 0.9 };
const frame = { timestampMs: 0, landmarks: [landmark] };

describe("parsePoseFrames", () => {
  it("reads back the frames a recording was saved with", () => {
    const frames = [poseFrame(0), poseFrame(40)];

    expect(parsePoseFrames(JSON.stringify(frames))).toEqual(frames);
  });

  it("treats a preset with no recorded pose as an empty recording", () => {
    expect(parsePoseFrames(null)).toEqual([]);
    expect(parsePoseFrames(undefined)).toEqual([]);
    expect(parsePoseFrames("")).toEqual([]);
  });

  it("treats unreadable JSON as an empty recording rather than throwing", () => {
    expect(parsePoseFrames("{not json")).toEqual([]);
  });

  it("treats a payload that is not a list of frames as an empty recording", () => {
    expect(parsePoseFrames(JSON.stringify({ frames: [frame] }))).toEqual([]);
  });

  it("drops entries that are not frame-shaped", () => {
    const payload = JSON.stringify([frame, null, "frame", 7, {}]);

    expect(parsePoseFrames(payload)).toEqual([frame]);
  });

  it("drops frames whose timestamp is missing or not a finite number", () => {
    const payload = JSON.stringify([
      { landmarks: [landmark] },
      { timestampMs: "0", landmarks: [landmark] },
      { timestampMs: null, landmarks: [landmark] },
      frame,
    ]);

    expect(parsePoseFrames(payload)).toEqual([frame]);
  });

  it("drops frames whose landmarks are missing or malformed", () => {
    const payload = JSON.stringify([
      { timestampMs: 0 },
      { timestampMs: 0, landmarks: [{ ...landmark, x: "0.5" }] },
      { timestampMs: 0, landmarks: [{ index: 11, x: 0.5, y: 0.5, z: 0 }] },
      { timestampMs: 0, landmarks: [null] },
      { timestampMs: 0, landmarks: ["landmark"] },
      frame,
    ]);

    expect(parsePoseFrames(payload)).toEqual([frame]);
  });

  /** Infinity survives JSON.parse only as a literal, so it is checked directly. */
  it("drops frames carrying non-finite coordinates", () => {
    const parsed = parsePoseFrames('[{"timestampMs":1e999,"landmarks":[]}]');

    expect(parsed).toEqual([]);
  });

  it("accepts a frame that recorded no landmarks at all", () => {
    expect(parsePoseFrames(JSON.stringify([{ timestampMs: 40, landmarks: [] }]))).toEqual([
      { timestampMs: 40, landmarks: [] },
    ]);
  });
});
