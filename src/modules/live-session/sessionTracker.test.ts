import { beforeEach, describe, expect, it, vi } from "vitest";
import { createSessionTracker } from "./sessionTracker";
import { createSessionClockStub } from "./testSessionClock";

let clock: ReturnType<typeof createSessionClockStub>;

const tracker = () => createSessionTracker(clock.clock);

function runningTracker() {
  const session = tracker();
  session.start();
  return session;
}

beforeEach(() => {
  clock = createSessionClockStub(1_754_000_000_000);
});

describe("createSessionTracker", () => {
  it("starts with no session under way", () => {
    expect(tracker().getSnapshot()).toEqual({
      status: "idle",
      startedAt: null,
      endedAt: null,
      elapsedMs: 0,
      triggerCount: 0,
      triggerCountsByMapping: {},
    });
  });

  it("notes when the session began", () => {
    const session = runningTracker();

    expect(session.getSnapshot()).toMatchObject({
      status: "running",
      startedAt: 1_754_000_000_000,
      elapsedMs: 0,
    });
    expect(clock.tickerCount).toBe(1);
  });

  it("keeps the elapsed time up to date while the session runs", () => {
    const session = runningTracker();

    clock.advance(2000);

    expect(session.getSnapshot().elapsedMs).toBe(2000);
  });

  it("starts a second session from scratch", () => {
    const session = runningTracker();
    session.recordSuccessfulTrigger("mapping-1");
    clock.advance(2000);

    session.start();

    expect(session.getSnapshot()).toMatchObject({
      elapsedMs: 0,
      triggerCount: 0,
      triggerCountsByMapping: {},
    });
    expect(clock.tickerCount).toBe(1);
  });

  it("tells its listeners as the session progresses", () => {
    const session = tracker();
    const listener = vi.fn();
    session.subscribe(listener);

    session.start();
    clock.advance(1000);

    expect(listener).toHaveBeenCalledTimes(2);
  });

  it("stops telling a listener that has unsubscribed", () => {
    const session = tracker();
    const listener = vi.fn();

    session.subscribe(listener)();
    session.start();

    expect(listener).not.toHaveBeenCalled();
  });
});

describe("counting successful triggers", () => {
  it("counts each trigger against the movement that caused it", () => {
    const session = runningTracker();

    session.recordSuccessfulTrigger("mapping-1");
    session.recordSuccessfulTrigger("mapping-2");
    session.recordSuccessfulTrigger("mapping-1");

    expect(session.getSnapshot()).toMatchObject({
      triggerCount: 3,
      triggerCountsByMapping: { "mapping-1": 2, "mapping-2": 1 },
    });
  });

  it("counts nothing before the session has begun", () => {
    const session = tracker();

    session.recordSuccessfulTrigger("mapping-1");

    expect(session.getSnapshot().triggerCount).toBe(0);
  });

  it("counts nothing after the session has ended", () => {
    const session = runningTracker();
    session.end();

    session.recordSuccessfulTrigger("mapping-1");

    expect(session.getSnapshot().triggerCount).toBe(0);
  });
});

describe("ending a session", () => {
  it("freezes the time the session ran for", () => {
    const session = runningTracker();
    clock.advance(756_000);

    session.end();

    expect(session.getSnapshot()).toMatchObject({
      status: "ended",
      endedAt: 1_754_000_756_000,
      elapsedMs: 756_000,
    });
    expect(clock.tickerCount).toBe(0);
  });

  it("leaves the elapsed time alone once the session has ended", () => {
    const session = runningTracker();
    clock.advance(756_000);
    session.end();

    clock.advance(60_000);

    expect(session.getSnapshot().elapsedMs).toBe(756_000);
  });

  it("has no session to end before one has begun", () => {
    const session = tracker();

    session.end();

    expect(session.getSnapshot().status).toBe("idle");
  });

  it("has no session to end once one has already ended", () => {
    const session = runningTracker();
    clock.advance(756_000);
    session.end();

    clock.advance(60_000);
    session.end();

    expect(session.getSnapshot().endedAt).toBe(1_754_000_756_000);
  });
});
