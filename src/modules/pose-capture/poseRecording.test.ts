import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createPoseRecording } from "./recording";
import { createFrameSourceStub, poseFrame, stillPoseFrames } from "./testPoses";

let nowMs = 0;

/** Walks the wall clock forward and lets the 50 ms countdown timer catch up with it. */
function advanceTo(elapsedMs: number) {
  nowMs = elapsedMs;
  vi.advanceTimersByTime(50);
}

beforeEach(() => {
  nowMs = 0;
  vi.useFakeTimers();
  vi.spyOn(performance, "now").mockImplementation(() => nowMs);
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("createPoseRecording", () => {
  it("starts idle with nothing recorded", () => {
    const recording = createPoseRecording(createFrameSourceStub().source);

    expect(recording.getSnapshot()).toEqual({
      countdownSeconds: null,
      isRecording: false,
      recordedFrames: [],
      recordingTrim: null,
      recordingState: "idle",
    });
  });

  it("reopens a saved recording ready to trim", () => {
    const frames = stillPoseFrames(11);
    const recording = createPoseRecording(createFrameSourceStub().source, frames, "recorded");

    expect(recording.getSnapshot().recordingState).toBe("recorded");
    expect(recording.getSnapshot().recordedFrames).toEqual(frames);
    expect(recording.getSnapshot().recordingTrim).toEqual({
      durationMs: 400,
      startMs: 0,
      endMs: 400,
    });
  });

  it("listens to the camera once, however often it is started", () => {
    const camera = createFrameSourceStub();
    const recording = createPoseRecording(camera.source);

    recording.start();
    recording.start();

    expect(camera.subscriberCount).toBe(1);
  });

  it("stops listening to the camera when torn down", () => {
    const camera = createFrameSourceStub();
    const recording = createPoseRecording(camera.source);

    recording.start();
    recording.stop();

    expect(camera.subscriberCount).toBe(0);
  });

  it("ignores frames arriving before the countdown finishes", () => {
    const camera = createFrameSourceStub();
    const recording = createPoseRecording(camera.source);
    recording.start();

    recording.startRecording();
    camera.emit(poseFrame(0));

    expect(recording.stopRecording()).toEqual([]);
  });

  it("counts the patient in before it starts recording", () => {
    const listener = vi.fn();
    const recording = createPoseRecording(createFrameSourceStub().source);
    recording.subscribe(listener);

    recording.startRecording();
    expect(recording.getSnapshot().countdownSeconds).toBe(3);
    expect(recording.getSnapshot().recordingState).toBe("countdown");

    advanceTo(50);
    expect(listener).toHaveBeenCalledTimes(1);

    advanceTo(1100);
    expect(recording.getSnapshot().countdownSeconds).toBe(2);

    advanceTo(3000);
    expect(recording.getSnapshot().countdownSeconds).toBeNull();
    expect(recording.getSnapshot().recordingState).toBe("recording");
  });

  it("records the frames that arrive once the countdown has finished", () => {
    const camera = createFrameSourceStub();
    const recording = createPoseRecording(camera.source);
    recording.start();
    recording.startRecording();
    advanceTo(3000);

    camera.emit(poseFrame(0), poseFrame(40));
    const recorded = recording.stopRecording();

    expect(recorded.map((frame) => frame.timestampMs)).toEqual([0, 40]);
    expect(recording.getSnapshot().recordingState).toBe("recorded");
    expect(recording.getSnapshot().recordingTrim).toEqual({
      durationMs: 40,
      startMs: 0,
      endMs: 40,
    });
  });

  /** Re-recording must not append to the previous take. */
  it("clears the previous take when a new recording begins", () => {
    const camera = createFrameSourceStub();
    const recording = createPoseRecording(camera.source, stillPoseFrames(11), "recorded");
    recording.start();

    recording.startRecording();
    advanceTo(3000);

    expect(recording.getSnapshot().recordedFrames).toEqual([]);
    expect(recording.getSnapshot().recordingTrim).toBeNull();
  });

  it("returns to idle when the patient cancels the countdown", () => {
    const recording = createPoseRecording(createFrameSourceStub().source);
    recording.startRecording();

    recording.cancelCountdown();
    advanceTo(3000);

    expect(recording.getSnapshot().recordingState).toBe("idle");
    expect(recording.getSnapshot().countdownSeconds).toBeNull();
  });

  it("throws the take away when the recording is reset", () => {
    const recording = createPoseRecording(createFrameSourceStub().source, stillPoseFrames(11));

    recording.resetRecording();

    expect(recording.getSnapshot()).toMatchObject({
      recordedFrames: [],
      recordingTrim: null,
      recordingState: "idle",
    });
  });

  it("narrows the saved frames to the trimmed range", () => {
    const recording = createPoseRecording(
      createFrameSourceStub().source,
      stillPoseFrames(11),
      "recorded",
    );

    recording.trimRecording({ durationMs: 400, startMs: 100, endMs: 300 });

    const snapshot = recording.getSnapshot();
    expect(snapshot.recordedFrames.map((frame) => frame.timestampMs)).toEqual([
      120, 160, 200, 240, 280,
    ]);
    expect(snapshot.recordingTrim).toEqual({ durationMs: 400, startMs: 100, endMs: 300 });
  });

  it("has nothing to trim when nothing was recorded", () => {
    const recording = createPoseRecording(createFrameSourceStub().source);

    recording.trimRecording({ durationMs: 400, startMs: 100, endMs: 300 });

    expect(recording.getSnapshot().recordingTrim).toBeNull();
  });

  it("stops telling a listener that has unsubscribed", () => {
    const listener = vi.fn();
    const recording = createPoseRecording(createFrameSourceStub().source);

    recording.subscribe(listener)();
    recording.resetRecording();

    expect(listener).not.toHaveBeenCalled();
  });
});
