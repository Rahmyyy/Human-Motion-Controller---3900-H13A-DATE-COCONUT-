import { describe, expect, it } from "vitest";
import {
  constrainRecordingTrimRange,
  createRecordingTrimRange,
  trimRecordingFrames,
} from "./recording";
import { stillPoseFrames } from "./testPoses";

const frames = stillPoseFrames(11);

describe("createRecordingTrimRange", () => {
  it("spans the whole recording", () => {
    expect(createRecordingTrimRange(frames)).toEqual({ durationMs: 400, startMs: 0, endMs: 400 });
  });

  it("has nothing to span when nothing was recorded", () => {
    expect(createRecordingTrimRange([])).toBeNull();
  });

  it("has nothing to span when the recording is a single instant", () => {
    expect(createRecordingTrimRange(stillPoseFrames(1))).toBeNull();
  });

  it("has nothing to span when the frames arrived out of order", () => {
    expect(createRecordingTrimRange([...frames].reverse())).toBeNull();
  });
});

describe("constrainRecordingTrimRange", () => {
  it("keeps a range that already fits the recording", () => {
    const range = { durationMs: 400, startMs: 100, endMs: 300 };

    expect(constrainRecordingTrimRange(range, 400)).toEqual(range);
  });

  it("pulls a range that overshoots back inside the recording", () => {
    expect(constrainRecordingTrimRange({ durationMs: 400, startMs: -50, endMs: 900 }, 400)).toEqual(
      { durationMs: 400, startMs: 0, endMs: 400 },
    );
  });

  /** Dragging the start past the end collapses the range rather than inverting it. */
  it("never lets the range end before it starts", () => {
    expect(constrainRecordingTrimRange({ durationMs: 400, startMs: 300, endMs: 100 }, 400)).toEqual(
      { durationMs: 400, startMs: 300, endMs: 300 },
    );
  });

  it("collapses the range when the recording has no duration", () => {
    expect(constrainRecordingTrimRange({ durationMs: 0, startMs: 50, endMs: 90 }, -10)).toEqual({
      durationMs: 0,
      startMs: 0,
      endMs: 0,
    });
  });
});

describe("trimRecordingFrames", () => {
  it("keeps the frames inside the range, measured from the first frame", () => {
    const trimmed = trimRecordingFrames(frames, { durationMs: 400, startMs: 100, endMs: 300 });

    expect(trimmed.map((frame) => frame.timestampMs)).toEqual([120, 160, 200, 240, 280]);
  });

  it("keeps the frames on the range's own boundaries", () => {
    const trimmed = trimRecordingFrames(frames, { durationMs: 400, startMs: 0, endMs: 400 });

    expect(trimmed).toHaveLength(frames.length);
  });

  it("has no frames to keep when nothing was recorded", () => {
    expect(trimRecordingFrames([], { durationMs: 400, startMs: 0, endMs: 400 })).toEqual([]);
  });
});
