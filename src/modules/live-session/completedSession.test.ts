import { describe, expect, it } from "vitest";
import { toCompletedSession } from "./completedSession";
import type { SessionSnapshot } from "./types";

const identity = {
  patientId: "patient-1",
  presetId: "preset-1",
  sessionId: "session-1",
};

const endedSnapshot = (overrides: Partial<SessionSnapshot> = {}): SessionSnapshot => ({
  status: "ended",
  startedAt: 1_754_000_000_000,
  endedAt: 1_754_000_756_000,
  elapsedMs: 756_000,
  triggerCount: 31,
  triggerCountsByMapping: { "mapping-1": 18, "mapping-2": 13 },
  ...overrides,
});

describe("toCompletedSession", () => {
  it("records the timestamps and per-mapping counts of a finished session", () => {
    expect(toCompletedSession(identity, endedSnapshot())).toEqual({
      sessionId: "session-1",
      patientId: "patient-1",
      presetId: "preset-1",
      startedAtMs: 1_754_000_000_000,
      endedAtMs: 1_754_000_756_000,
      triggerCountsByMapping: { "mapping-1": 18, "mapping-2": 13 },
    });
  });

  it("records a session that ran without a single trigger", () => {
    const snapshot = endedSnapshot({ triggerCount: 0, triggerCountsByMapping: {} });

    expect(toCompletedSession(identity, snapshot)?.triggerCountsByMapping).toEqual({});
  });

  it("does not record a session that never started", () => {
    expect(toCompletedSession(identity, null)).toBeNull();
  });

  it("does not record a session that is still running", () => {
    const snapshot = endedSnapshot({ status: "running", endedAt: null });

    expect(toCompletedSession(identity, snapshot)).toBeNull();
  });

  it("does not record a session missing the patient, preset, or session it belongs to", () => {
    expect(toCompletedSession({ ...identity, patientId: null }, endedSnapshot())).toBeNull();
    expect(toCompletedSession({ ...identity, presetId: null }, endedSnapshot())).toBeNull();
    expect(toCompletedSession({ ...identity, sessionId: null }, endedSnapshot())).toBeNull();
  });
});
