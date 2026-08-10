import { beforeEach, describe, expect, it, vi } from "vitest";
import { createLiveSessionWithDependencies } from "./liveSession";
import { createSessionTracker } from "./sessionTracker";
import {
  createLiveSessionDependencies,
  createRecognitionStub,
  flushPromises,
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

/** A session that has been running for a while, with one movement having fired. */
async function busySession() {
  const live = session();
  await live.start("patient-1", "preset-1", "session-1");
  tracker.recordSuccessfulTrigger("mapping-1");
  clock.advance(756_000);
  return live;
}

const summary = {
  elapsedMs: 756_000,
  triggerCount: 1,
  triggerCountsByMapping: { "mapping-1": 1 },
};

beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => {});
  clock = createSessionClockStub(1_754_000_000_000);
  tracker = createSessionTracker(clock.clock);
  recognition = createRecognitionStub();
  dependencies = createLiveSessionDependencies(recognition);
});

describe("ending an overlay session", () => {
  it("writes the session into the patient's history before closing", async () => {
    const live = await busySession();

    await live.end();

    expect(dependencies.recordCompletedSession).toHaveBeenCalledWith({
      sessionId: "session-1",
      patientId: "patient-1",
      presetId: "preset-1",
      startedAtMs: 1_754_000_000_000,
      endedAtMs: 1_754_000_756_000,
      triggerCountsByMapping: { "mapping-1": 1 },
    });
    expect(dependencies.recordCompletedSession).toHaveBeenCalledBefore(dependencies.closeOverlay);
  });

  it("closes the overlay with what the session achieved", async () => {
    const live = await busySession();

    await live.end();

    expect(dependencies.closeOverlay).toHaveBeenCalledWith("session-1", summary);
    expect(live.getSnapshot()).toMatchObject({ phase: "ended", elapsedMs: 756_000 });
    expect(recognition.runtime.dispose).toHaveBeenCalled();
    expect(tracker.getSnapshot().status).toBe("ended");
  });

  it("marks the patient as recently active as the session closes", async () => {
    const live = await busySession();

    await live.end();

    expect(dependencies.recordPatientActivity).toHaveBeenCalledTimes(2);
  });

  /** Losing a history row must not strand the patient with an overlay they cannot close. */
  it("still closes the overlay when the history could not be written", async () => {
    dependencies.recordCompletedSession.mockRejectedValue(new Error("offline"));
    const live = await busySession();

    await live.end();

    expect(dependencies.closeOverlay).toHaveBeenCalled();
  });

  it("carries on when the patient's activity could not be recorded", async () => {
    dependencies.recordPatientActivity.mockRejectedValue(new Error("offline"));
    const live = await busySession();

    await live.end();

    expect(dependencies.closeOverlay).toHaveBeenCalled();
  });

  it("shows why the overlay would not close", async () => {
    dependencies.closeOverlay.mockRejectedValue(new Error("window gone"));
    const live = await busySession();

    await live.end();

    expect(live.getSnapshot().recognitionStatus.error).toBe("window gone");
  });

  it("ends once however often the patient presses stop", async () => {
    const live = await busySession();

    await Promise.all([live.end(), live.end()]);

    expect(dependencies.closeOverlay).toHaveBeenCalledTimes(1);
  });

  it("ends when the main window asks it to", async () => {
    const live = await busySession();

    dependencies.requestEnd("session-1");
    await flushPromises();

    expect(live.getSnapshot().phase).toBe("ended");
    expect(dependencies.closeOverlay).toHaveBeenCalled();
  });

  it("ignores a request to end some other session", async () => {
    const live = await busySession();

    dependencies.requestEnd("session-2");
    await flushPromises();

    expect(live.getSnapshot().phase).toBe("running");
  });
});

describe("ending a session that never got going", () => {
  it("has no session to write into the patient's history", async () => {
    const live = session();
    await live.start("patient-1", "preset-1", undefined);

    await live.end();

    expect(dependencies.recordCompletedSession).not.toHaveBeenCalled();
    expect(dependencies.closeOverlay).not.toHaveBeenCalled();
  });

  it("still closes an overlay whose recognition never started", async () => {
    recognition.runtime.start.mockRejectedValue(new Error("offline"));
    const live = session();
    await live.start("patient-1", "preset-1", "session-1");

    await live.end();

    expect(dependencies.closeOverlay).toHaveBeenCalledWith("session-1", {
      elapsedMs: 0,
      triggerCount: 0,
      triggerCountsByMapping: {},
    });
    expect(dependencies.recordCompletedSession).not.toHaveBeenCalled();
  });
});

describe("leaving the overlay page", () => {
  it("stops recognition and the session clock", async () => {
    const live = await busySession();

    live.dispose();

    expect(recognition.runtime.dispose).toHaveBeenCalled();
    expect(dependencies.unlisten).toHaveBeenCalled();
    expect(tracker.getSnapshot().status).toBe("ended");
  });

  it("stops listening for the main window's end request", async () => {
    const live = await busySession();
    live.dispose();

    dependencies.requestEnd("session-1");
    await flushPromises();

    expect(dependencies.closeOverlay).not.toHaveBeenCalled();
  });
});
