import { beforeEach, describe, expect, it, vi } from "vitest";
import { emitTo, listen } from "@tauri-apps/api/event";
import { invokeNative } from "@/contracts/native";
import { PressType } from "@/modules/movement-mapping";
import {
  closeOverlay,
  createSessionId,
  executeAction,
  onEndSessionRequested,
  onSessionEnded,
  openOverlay,
  recordCompletedSession,
  requestOverlayEnd,
} from "./tauriSession";

vi.mock("@tauri-apps/api/event", () => ({ emitTo: vi.fn(), listen: vi.fn() }));
vi.mock("@/contracts/native", () => ({ invokeNative: vi.fn() }));

const invoke = vi.mocked(invokeNative);
const subscribe = vi.mocked(listen);
const emit = vi.mocked(emitTo);

const summary = {
  elapsedMs: 756_000,
  triggerCount: 31,
  triggerCountsByMapping: { "mapping-1": 31 },
};
const completed = {
  sessionId: "session-1",
  patientId: "patient-1",
  presetId: "preset-1",
  startedAtMs: 1_754_000_000_000,
  endedAtMs: 1_754_000_756_000,
  triggerCountsByMapping: { "mapping-1": 31 },
};

/** Hands the listener the payload the native side emitted, as Tauri's event wrapper does. */
function deliver<T>(payload: T) {
  const handler = subscribe.mock.calls[0][1] as (event: { payload: T }) => void;
  handler({ payload });
}

beforeEach(() => {
  vi.clearAllMocks();
  invoke.mockResolvedValue(undefined as never);
  subscribe.mockResolvedValue(vi.fn());
});

describe("driving the overlay window", () => {
  it("opens the overlay for one patient's session", async () => {
    await openOverlay("patient-1", "preset-1", "session-1");

    expect(invoke).toHaveBeenCalledWith("open_overlay", {
      patientId: "patient-1",
      presetId: "preset-1",
      sessionId: "session-1",
    });
  });

  it("closes the overlay with the session's totals", async () => {
    await closeOverlay("session-1", summary);

    expect(invoke).toHaveBeenCalledWith("close_overlay", { sessionId: "session-1", summary });
  });

  it("asks the overlay to end the session it is running", async () => {
    await requestOverlayEnd("session-1");

    expect(emit).toHaveBeenCalledWith("overlay", "end-session-requested", {
      sessionId: "session-1",
    });
  });
});

describe("recording what a session did", () => {
  it("writes the finished session into the patient's history", async () => {
    await recordCompletedSession(completed);

    expect(invoke).toHaveBeenCalledWith("record_completed_session", { session: completed });
  });

  it("presses the key a recognised movement is bound to", async () => {
    await executeAction("Spacebar", PressType.Toggle);

    expect(invoke).toHaveBeenCalledWith("execute_action", {
      key: "Spacebar",
      pressType: "Toggle",
    });
  });
});

describe("session events", () => {
  it("hands the caller just the payload of a finished session", async () => {
    const listener = vi.fn();

    await onSessionEnded(listener);
    deliver({ sessionId: "session-1", summary });

    expect(subscribe).toHaveBeenCalledWith("session-ended", expect.any(Function));
    expect(listener).toHaveBeenCalledWith({ sessionId: "session-1", summary });
  });

  it("hands the caller just the payload of an end request", async () => {
    const listener = vi.fn();

    await onEndSessionRequested(listener);
    deliver({ sessionId: "session-1" });

    expect(subscribe).toHaveBeenCalledWith("end-session-requested", expect.any(Function));
    expect(listener).toHaveBeenCalledWith({ sessionId: "session-1" });
  });
});

describe("createSessionId", () => {
  it("names each session with a fresh identifier", () => {
    expect(createSessionId()).not.toBe(createSessionId());
  });
});
