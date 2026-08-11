import { beforeEach, describe, expect, it, vi } from "vitest";
import { createSessionLauncher, createSessionLauncherWithDependencies } from "./sessionLauncher";
import { createLauncherDependencies, flushPromises, sessionSummary } from "./testLauncher";

let dependencies: ReturnType<typeof createLauncherDependencies>;

const launcher = () => createSessionLauncherWithDependencies(dependencies);

async function startedLauncher() {
  const session = launcher();
  await session.start("patient-1", "preset-1");
  return session;
}

beforeEach(() => {
  dependencies = createLauncherDependencies();
});

describe("createSessionLauncher", () => {
  it("starts with no session under way", () => {
    expect(createSessionLauncher().getSnapshot()).toEqual({
      error: null,
      status: "idle",
      summary: null,
    });
  });
});

describe("starting a session", () => {
  it("opens the overlay under a fresh session id", async () => {
    const session = await startedLauncher();

    expect(dependencies.openOverlay).toHaveBeenCalledWith("patient-1", "preset-1", "session-1");
    expect(session.getSnapshot()).toEqual({ error: null, status: "running", summary: null });
  });

  it("listens for the overlay finishing before it opens it", async () => {
    await startedLauncher();

    expect(dependencies.onSessionEnded).toHaveBeenCalledBefore(dependencies.openOverlay);
  });

  it("tells the clinician when the preset was not given", async () => {
    const session = launcher();

    await session.start("patient-1", undefined);

    expect(session.getSnapshot()).toEqual({
      error: "Preset not found.",
      status: "error",
      summary: null,
    });
    expect(dependencies.openOverlay).not.toHaveBeenCalled();
  });

  it("tells the clinician when the patient was not given", async () => {
    const session = launcher();

    await session.start(undefined, "preset-1");

    expect(session.getSnapshot().status).toBe("error");
  });

  it("tells the clinician when the overlay would not open", async () => {
    dependencies.openOverlay.mockRejectedValue(new Error("no display"));
    const session = launcher();

    await session.start("patient-1", "preset-1");

    expect(session.getSnapshot()).toEqual({
      error: "no display",
      status: "error",
      summary: null,
    });
    expect(dependencies.unlisten).toHaveBeenCalled();
  });

  it("describes a failure that was not thrown as an error", async () => {
    dependencies.openOverlay.mockRejectedValue("no display");
    const session = launcher();

    await session.start("patient-1", "preset-1");

    expect(session.getSnapshot().error).toBe("no display");
  });

  it("drops the listener of a start a newer one has overtaken", async () => {
    const session = launcher();

    await Promise.all([
      session.start("patient-1", "preset-1"),
      session.start("patient-1", "preset-2"),
    ]);

    expect(dependencies.unlisten).toHaveBeenCalledTimes(1);
    expect(session.getSnapshot().status).toBe("running");
  });

  it("ignores a failed start that a newer one has overtaken", async () => {
    let failOpening: (error: Error) => void = () => {};
    dependencies.openOverlay.mockImplementationOnce(
      () => new Promise<void>((_, reject) => (failOpening = reject)),
    );
    const session = launcher();
    const first = session.start("patient-1", "preset-1");
    await flushPromises();

    const second = session.start("patient-1", "preset-2");
    failOpening(new Error("no display"));
    await Promise.all([first, second]);

    expect(session.getSnapshot().error).toBeNull();
  });

  it("stops telling a listener that has unsubscribed", async () => {
    const session = launcher();
    const listener = vi.fn();

    session.subscribe(listener)();
    await session.start("patient-1", "preset-1");

    expect(listener).not.toHaveBeenCalled();
  });
});

describe("the overlay reporting a session has finished", () => {
  it("shows what the session achieved", async () => {
    const session = await startedLauncher();
    const summary = sessionSummary();

    dependencies.emitSessionEnded({ sessionId: "session-1", summary });

    expect(session.getSnapshot()).toEqual({ error: null, status: "ended", summary });
    expect(dependencies.unlisten).toHaveBeenCalled();
  });

  it("ignores a report about some other session", async () => {
    const session = await startedLauncher();

    dependencies.emitSessionEnded({ sessionId: "session-2", summary: sessionSummary() });

    expect(session.getSnapshot().status).toBe("running");
  });

  /** A very short session can finish before the overlay has finished opening. */
  it("stays finished when the overlay reports back mid-open", async () => {
    let finishOpening = () => {};
    dependencies.openOverlay.mockImplementation(
      () => new Promise<void>((resolve) => (finishOpening = resolve)),
    );
    const session = launcher();
    const starting = session.start("patient-1", "preset-1");
    await flushPromises();

    dependencies.emitSessionEnded({ sessionId: "session-1", summary: sessionSummary() });
    finishOpening();
    await starting;

    expect(session.getSnapshot().status).toBe("ended");
  });
});
