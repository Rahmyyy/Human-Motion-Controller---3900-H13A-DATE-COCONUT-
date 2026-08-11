import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { poseService } from "@/features/camera/services/poseService";
import {
  createLiveSession,
  sessionTracker,
  type LiveSession,
  type LiveSessionSnapshot,
} from "@/modules/live-session";
import { useLiveSession } from "./useLiveSession";

// The live session belongs to the live-session module; this hook only adapts it to React.
vi.mock("@/modules/live-session", () => ({
  createLiveSession: vi.fn(),
  sessionTracker: { name: "session-tracker" },
}));
vi.mock("@/features/camera/services/poseService", () => ({
  poseService: { name: "pose-service" },
}));

const idle: LiveSessionSnapshot = {
  elapsedMs: 0,
  phase: "idle",
  presetName: "",
  recognitionStatus: {
    bestMatch: null,
    mappingStatuses: [],
    triggeredMappingId: null,
    waitingForDefaultPose: false,
    error: null,
  },
  triggerCount: 0,
};

let listener: (() => void) | null;
let snapshot: LiveSessionSnapshot;
let session: LiveSession;

function Probe({ patientId = "patient-1", presetId = "preset-1", sessionId = "session-1" }) {
  const view = useLiveSession(patientId, presetId, sessionId);
  return (
    <button type="button" onClick={() => void view.endSession()}>
      {view.phase}:{view.presetName || "unnamed"}
    </button>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  listener = null;
  snapshot = idle;
  session = {
    getSnapshot: () => snapshot,
    subscribe: (next: () => void) => {
      listener = next;
      return () => {
        listener = null;
      };
    },
    start: vi.fn(() => Promise.resolve()),
    end: vi.fn(() => Promise.resolve()),
    dispose: vi.fn(),
  };
  vi.mocked(createLiveSession).mockReturnValue(session);
});

describe("useLiveSession", () => {
  it("builds the session on the pose service and the shared tracker", () => {
    render(<Probe />);

    expect(createLiveSession).toHaveBeenCalledWith(poseService, sessionTracker);
  });

  /** The session id comes from the overlay window's query string, not the route. */
  it("starts the session for the route and session it was opened with", () => {
    render(<Probe />);

    expect(session.start).toHaveBeenCalledWith("patient-1", "preset-1", "session-1");
  });

  it("exposes the session snapshot to the overlay", () => {
    render(<Probe />);

    expect(screen.getByRole("button")).toHaveTextContent("idle:unnamed");
  });

  it("re-renders when the session publishes a change", () => {
    render(<Probe />);

    snapshot = { ...idle, phase: "running", presetName: "Mario Kart" };
    act(() => listener?.());

    expect(screen.getByRole("button")).toHaveTextContent("running:Mario Kart");
  });

  it("exposes the end command to the overlay", async () => {
    render(<Probe />);

    await userEvent.click(screen.getByRole("button"));

    expect(session.end).toHaveBeenCalled();
  });

  /** One session per mount: a re-render must not restart recognition mid-session. */
  it("keeps the same session across re-renders", () => {
    const { rerender } = render(<Probe />);

    rerender(<Probe />);

    expect(createLiveSession).toHaveBeenCalledTimes(1);
  });

  it("disposes the session when the overlay closes", () => {
    render(<Probe />).unmount();

    expect(session.dispose).toHaveBeenCalled();
  });

  it("restarts when the overlay is reopened for another session", () => {
    const { rerender } = render(<Probe />);

    rerender(<Probe sessionId="session-2" />);

    expect(session.dispose).toHaveBeenCalled();
    expect(session.start).toHaveBeenLastCalledWith("patient-1", "preset-1", "session-2");
  });
});
