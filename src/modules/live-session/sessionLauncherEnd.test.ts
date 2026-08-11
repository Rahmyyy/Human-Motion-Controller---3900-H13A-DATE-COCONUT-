import { beforeEach, describe, expect, it } from "vitest";
import { createSessionLauncherWithDependencies } from "./sessionLauncher";
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

describe("ending a session from the main window", () => {
  it("asks the overlay to wrap up", async () => {
    const session = await startedLauncher();

    await session.end();

    expect(dependencies.requestOverlayEnd).toHaveBeenCalledWith("session-1");
    expect(session.getSnapshot().status).toBe("ending");
  });

  /** The overlay cannot be asked to stop before it has finished opening. */
  it("waits for the overlay to finish opening first", async () => {
    let finishOpening = () => {};
    dependencies.openOverlay.mockImplementation(
      () => new Promise<void>((resolve) => (finishOpening = resolve)),
    );
    const session = launcher();
    const starting = session.start("patient-1", "preset-1");
    await flushPromises();

    const ending = session.end();
    expect(dependencies.requestOverlayEnd).not.toHaveBeenCalled();

    finishOpening();
    await Promise.all([starting, ending]);

    expect(dependencies.requestOverlayEnd).toHaveBeenCalledWith("session-1");
  });

  it("asks only once however often the clinician presses stop", async () => {
    const session = await startedLauncher();

    await Promise.all([session.end(), session.end()]);

    expect(dependencies.requestOverlayEnd).toHaveBeenCalledTimes(1);
  });

  it("stays ending until the overlay reports what the session achieved", async () => {
    const session = await startedLauncher();
    await session.end();
    const summary = sessionSummary();

    dependencies.emitSessionEnded({ sessionId: "session-1", summary });

    expect(session.getSnapshot()).toEqual({ error: null, status: "ended", summary });
  });

  it("has no session to end before one has been started", async () => {
    const session = launcher();

    await session.end();

    expect(dependencies.requestOverlayEnd).not.toHaveBeenCalled();
    expect(session.getSnapshot().status).toBe("idle");
  });

  it("has no session to end once the overlay has already reported back", async () => {
    const session = await startedLauncher();
    dependencies.emitSessionEnded({ sessionId: "session-1", summary: sessionSummary() });

    await session.end();

    expect(dependencies.requestOverlayEnd).not.toHaveBeenCalled();
    expect(session.getSnapshot().status).toBe("ended");
  });

  it("tells the clinician when the overlay would not wrap up", async () => {
    dependencies.requestOverlayEnd.mockRejectedValue(new Error("overlay gone"));
    const session = await startedLauncher();

    await session.end();

    expect(session.getSnapshot()).toEqual({
      error: "overlay gone",
      status: "error",
      summary: null,
    });
  });

  it("ignores a failed end that a newer start has overtaken", async () => {
    let failEnd: (error: Error) => void = () => {};
    dependencies.requestOverlayEnd.mockImplementation(
      () => new Promise<void>((_, reject) => (failEnd = reject)),
    );
    const session = await startedLauncher();

    const ending = session.end();
    await session.start("patient-1", "preset-2");
    failEnd(new Error("overlay gone"));
    await ending;

    expect(session.getSnapshot().status).toBe("running");
  });

  it("lets a new session be started after one is ended", async () => {
    const session = await startedLauncher();
    await session.end();

    await session.start("patient-1", "preset-2");

    expect(session.getSnapshot().status).toBe("running");
    expect(dependencies.openOverlay).toHaveBeenCalledTimes(2);
  });
});

describe("leaving the page mid-session", () => {
  it("stops listening for the overlay", async () => {
    const session = await startedLauncher();

    session.dispose();

    expect(dependencies.unlisten).toHaveBeenCalled();
  });

  it("forgets the session it was running", async () => {
    const session = await startedLauncher();

    session.dispose();
    await session.end();

    expect(dependencies.requestOverlayEnd).not.toHaveBeenCalled();
  });
});
