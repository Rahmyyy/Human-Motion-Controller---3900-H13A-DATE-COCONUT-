import { beforeEach, describe, expect, it, vi } from "vitest";
import { createFrameSourceStub } from "@/modules/pose-capture/testPoses";
import { createLiveSession, createLiveSessionWithDependencies } from "./liveSession";
import { emptyRecognitionStatus } from "./presetRecognition";
import { createSessionTracker } from "./sessionTracker";
import {
  createLiveSessionDependencies,
  createRecognitionStub,
  flushPromises,
  recognitionSnapshot,
} from "./testLiveSession";
import { createSessionClockStub } from "./testSessionClock";

let clock: ReturnType<typeof createSessionClockStub>;
let tracker: ReturnType<typeof createSessionTracker>;
let recognition: ReturnType<typeof createRecognitionStub>;
let dependencies: ReturnType<typeof createLiveSessionDependencies>;

const session = () =>
  createLiveSessionWithDependencies(
    tracker,
    dependencies as unknown as Parameters<typeof createLiveSessionWithDependencies>[1],
  );

async function runningSession() {
  const live = session();
  await live.start("patient-1", "preset-1", "session-1");
  return live;
}

beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => {});
  clock = createSessionClockStub(1_754_000_000_000);
  tracker = createSessionTracker(clock.clock);
  recognition = createRecognitionStub();
  dependencies = createLiveSessionDependencies(recognition);
});

describe("createLiveSession", () => {
  it("starts idle with nothing recognised", () => {
    const live = createLiveSession(createFrameSourceStub().source, tracker);

    expect(live.getSnapshot()).toEqual({
      elapsedMs: 0,
      phase: "idle",
      presetName: "Session",
      recognitionStatus: emptyRecognitionStatus(),
      triggerCount: 0,
    });
  });
});

describe("starting an overlay session", () => {
  it("runs the preset and starts timing the session", async () => {
    const live = await runningSession();

    expect(recognition.runtime.start).toHaveBeenCalledWith("patient-1", "preset-1");
    expect(live.getSnapshot()).toMatchObject({ phase: "running", presetName: "Mario Kart" });
    expect(tracker.getSnapshot().status).toBe("running");
  });

  it("marks the patient as recently active", async () => {
    await runningSession();

    expect(dependencies.recordPatientActivity).toHaveBeenCalledWith("patient-1");
  });

  it("carries on when the patient's activity could not be recorded", async () => {
    dependencies.recordPatientActivity.mockRejectedValue(new Error("offline"));

    const live = await runningSession();

    expect(live.getSnapshot().phase).toBe("running");
  });

  it("falls back to a plain title when the preset has no name", async () => {
    recognition = createRecognitionStub(recognitionSnapshot({ presetName: null }));
    dependencies = createLiveSessionDependencies(recognition);

    const live = await runningSession();

    expect(live.getSnapshot().presetName).toBe("Session");
  });

  it("keeps the elapsed time and trigger count up to date", async () => {
    const live = await runningSession();

    tracker.recordSuccessfulTrigger("mapping-1");
    clock.advance(2000);

    expect(live.getSnapshot()).toMatchObject({ elapsedMs: 2000, triggerCount: 1 });
  });

  it("passes recognition's own updates on to the overlay", async () => {
    const live = await runningSession();

    recognition.publish(recognitionSnapshot({ presetName: "Chess", error: "Key not supported" }));

    expect(live.getSnapshot().presetName).toBe("Chess");
    expect(live.getSnapshot().recognitionStatus.error).toBe("Key not supported");
  });

  it("keeps the last known preset name when an update omits it", async () => {
    const live = await runningSession();

    recognition.publish(recognitionSnapshot({ presetName: null }));

    expect(live.getSnapshot().presetName).toBe("Mario Kart");
  });
});

describe("an overlay session that cannot start", () => {
  it("tells the patient when the session was not identified", async () => {
    const live = session();

    await live.start("patient-1", "preset-1", undefined);

    expect(live.getSnapshot()).toMatchObject({ phase: "error" });
    expect(live.getSnapshot().recognitionStatus.error).toBe("Preset not found.");
    expect(dependencies.createRecognition).not.toHaveBeenCalled();
  });

  it("shows why recognition would not run", async () => {
    recognition = createRecognitionStub(
      recognitionSnapshot({ phase: "error", error: "Record a resting pose first." }),
    );
    dependencies = createLiveSessionDependencies(recognition);

    const live = await runningSession();

    expect(live.getSnapshot().recognitionStatus.error).toBe("Record a resting pose first.");
    expect(tracker.getSnapshot().status).toBe("idle");
  });

  it("shows a general message when recognition gave no reason", async () => {
    recognition = createRecognitionStub(recognitionSnapshot({ phase: "idle" }));
    dependencies = createLiveSessionDependencies(recognition);

    const live = await runningSession();

    expect(live.getSnapshot().recognitionStatus.error).toBe("Unable to start recognition.");
  });

  it("shows why the preset could not be loaded", async () => {
    recognition.runtime.start.mockRejectedValue(new Error("offline"));

    const live = await runningSession();

    expect(live.getSnapshot()).toMatchObject({ phase: "error" });
    expect(live.getSnapshot().recognitionStatus.error).toBe("offline");
  });

  it("ignores a start that a newer one has overtaken", async () => {
    const live = session();

    await Promise.all([
      live.start("patient-1", "preset-1", "session-1"),
      live.start("patient-1", "preset-2", "session-2"),
    ]);

    expect(dependencies.unlisten).toHaveBeenCalledTimes(1);
    expect(live.getSnapshot().phase).toBe("running");
  });

  it("ignores a failed start that a newer one has overtaken", async () => {
    let failStart: (error: Error) => void = () => {};
    recognition.runtime.start.mockImplementationOnce(
      () => new Promise<void>((_, reject) => (failStart = reject)),
    );
    const live = session();
    const first = live.start("patient-1", "preset-1", "session-1");
    await flushPromises();

    const second = live.start("patient-1", "preset-2", "session-2");
    failStart(new Error("offline"));
    await Promise.all([first, second]);

    expect(live.getSnapshot().phase).toBe("running");
  });

  it("stops telling a listener that has unsubscribed", async () => {
    const live = session();
    const listener = vi.fn();

    live.subscribe(listener)();
    await live.start("patient-1", "preset-1", "session-1");

    expect(listener).not.toHaveBeenCalled();
  });
});
