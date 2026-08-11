import { describe, expect, it } from "vitest";
import { normalizePoseFrame, normalizePoseFrames } from "./analysis";
import { TRACKED_LANDMARKS } from "./domain";
import { hideAllBut, poseFrame, stillPoseFrames } from "./testPoses";

/** Every torso joint collapsed onto one point, leaving no length to scale by. */
const collapsedTorso = {
  11: point(0.5, 0.7),
  12: point(0.5, 0.7),
  23: point(0.5, 0.7),
  24: point(0.5, 0.7),
};

describe("normalizePoseFrame", () => {
  it("centres the body on the hips and scales it by the torso length", () => {
    const frame = normalizePoseFrame(poseFrame(120));

    expect(frame?.timestampMs).toBe(120);
    expect(frame?.landmarks[11]?.x).toBeCloseTo(-0.25);
    expect(frame?.landmarks[11]?.y).toBeCloseTo(-1);
    expect(frame?.landmarks[24]?.x).toBeCloseTo(0.125);
    expect(frame?.landmarks[24]?.y).toBeCloseTo(0);
  });

  it("counts every tracked joint the camera could see", () => {
    expect(normalizePoseFrame(poseFrame(0))?.visibleCount).toBe(TRACKED_LANDMARKS.length);
  });

  it("leaves out joints the camera was unsure about", () => {
    const frame = normalizePoseFrame(poseFrame(0, { 16: { visibility: 0.4 } }));

    expect(frame?.landmarks[16]).toBeUndefined();
    expect(frame?.visibleCount).toBe(TRACKED_LANDMARKS.length - 1);
  });

  /** A seated or close-up patient shows shoulders but no hips; shoulder width stands in. */
  it("falls back to shoulder width when the hips are out of shot", () => {
    const frame = normalizePoseFrame(poseFrame(0, hideAllBut(11, 12)));

    expect(frame?.landmarks[11]).toEqual({ x: -0.5, y: 0 });
    expect(frame?.visibleCount).toBe(2);
  });

  it("falls back to shoulder width when the torso has no measurable length", () => {
    const frame = normalizePoseFrame(
      poseFrame(0, {
        11: point(0.4, 0.7),
        12: point(0.6, 0.7),
        23: point(0.4, 0.7),
        24: point(0.6, 0.7),
      }),
    );

    expect(frame?.landmarks[11]).toEqual({ x: -0.5, y: 0 });
  });

  it("rejects a frame with no visible torso to centre on", () => {
    expect(normalizePoseFrame(poseFrame(0, hideAllBut(25, 26)))).toBeNull();
  });

  it("rejects a frame showing hips but no shoulders to measure against", () => {
    expect(normalizePoseFrame(poseFrame(0, hideAllBut(23, 24)))).toBeNull();
  });

  it("rejects a frame whose landmarks all collapsed onto one point", () => {
    expect(normalizePoseFrame(poseFrame(0, collapsedTorso))).toBeNull();
  });

  it("rejects a frame that recorded no landmarks at all", () => {
    expect(normalizePoseFrame({ timestampMs: 0, landmarks: [] })).toBeNull();
  });
});

describe("normalizePoseFrames", () => {
  it("normalizes a whole recording in order", () => {
    const frames = normalizePoseFrames(stillPoseFrames(3));

    expect(frames.map((frame) => frame.timestampMs)).toEqual([0, 40, 80]);
  });

  it("skips the frames where the patient stepped out of shot", () => {
    const frames = normalizePoseFrames([
      poseFrame(0),
      poseFrame(40, hideAllBut(25, 26)),
      poseFrame(80),
    ]);

    expect(frames.map((frame) => frame.timestampMs)).toEqual([0, 80]);
  });

  it("normalizes an empty recording to nothing", () => {
    expect(normalizePoseFrames([])).toEqual([]);
  });
});

function point(x: number, y: number) {
  return { x, y };
}
