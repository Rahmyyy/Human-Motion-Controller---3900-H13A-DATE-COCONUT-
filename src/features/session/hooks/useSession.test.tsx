import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { sessionTracker, type SessionSnapshot } from "@/modules/live-session";
import { useSession } from "./useSession";

// The tracker is a singleton shared by every panel; this hook only subscribes a component to it.
vi.mock("@/modules/live-session", () => ({
  sessionTracker: {
    getSnapshot: vi.fn(),
    subscribe: vi.fn(() => () => {}),
    start: vi.fn(),
    end: vi.fn(),
  },
}));

const tracker = vi.mocked(sessionTracker);

const idle: SessionSnapshot = {
  status: "idle",
  startedAt: null,
  endedAt: null,
  elapsedMs: 0,
  triggerCount: 0,
  triggerCountsByMapping: {},
};

function Probe() {
  const { elapsedMs, endSession, startSession, status } = useSession();
  return (
    <>
      <p>
        {status}:{elapsedMs}
      </p>
      <button type="button" onClick={startSession}>
        start
      </button>
      <button type="button" onClick={endSession}>
        end
      </button>
    </>
  );
}

function publish(snapshot: SessionSnapshot) {
  tracker.getSnapshot.mockReturnValue(snapshot);
  act(() => tracker.subscribe.mock.calls[0]?.[0]());
}

beforeEach(() => {
  vi.clearAllMocks();
  tracker.getSnapshot.mockReturnValue(idle);
  tracker.subscribe.mockReturnValue(() => {});
});

describe("useSession", () => {
  it("exposes the tracker's current snapshot", () => {
    render(<Probe />);

    expect(screen.getByText("idle:0")).toBeInTheDocument();
  });

  it("re-renders when the tracker publishes a change", () => {
    render(<Probe />);

    publish({ ...idle, status: "running", elapsedMs: 5_000 });

    expect(screen.getByText("running:5000")).toBeInTheDocument();
  });

  it("starts the shared session", async () => {
    render(<Probe />);

    await userEvent.click(screen.getByRole("button", { name: "start" }));

    expect(tracker.start).toHaveBeenCalled();
  });

  it("ends the shared session", async () => {
    render(<Probe />);

    await userEvent.click(screen.getByRole("button", { name: "end" }));

    expect(tracker.end).toHaveBeenCalled();
  });

  it("unsubscribes when the component unmounts", () => {
    const unsubscribe = vi.fn();
    tracker.subscribe.mockReturnValue(unsubscribe);

    render(<Probe />).unmount();

    expect(unsubscribe).toHaveBeenCalled();
  });
});
