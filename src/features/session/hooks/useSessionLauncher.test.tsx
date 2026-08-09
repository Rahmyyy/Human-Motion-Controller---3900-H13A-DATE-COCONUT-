import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createSessionLauncher,
  type SessionLauncher,
  type SessionLauncherSnapshot,
} from "@/modules/live-session";
import { useSessionLauncher } from "./useSessionLauncher";

// The launcher owns the overlay window; this hook only adapts its snapshot to React.
vi.mock("@/modules/live-session", () => ({ createSessionLauncher: vi.fn() }));

const idle: SessionLauncherSnapshot = { error: null, status: "idle", summary: null };

let listener: (() => void) | null;
let snapshot: SessionLauncherSnapshot;
let launcher: SessionLauncher;

function Probe({ patientId = "patient-1", presetId = "preset-1" }) {
  const view = useSessionLauncher(patientId, presetId);
  return (
    <button type="button" onClick={() => void view.endSession()}>
      {view.status}
    </button>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  listener = null;
  snapshot = idle;
  launcher = {
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
  vi.mocked(createSessionLauncher).mockReturnValue(launcher);
});

describe("useSessionLauncher", () => {
  it("launches the session for the route it was mounted on", () => {
    render(<Probe />);

    expect(createSessionLauncher).toHaveBeenCalled();
    expect(launcher.start).toHaveBeenCalledWith("patient-1", "preset-1");
  });

  it("exposes the launcher snapshot to the page", () => {
    render(<Probe />);

    expect(screen.getByRole("button")).toHaveTextContent("idle");
  });

  it("re-renders when the launcher publishes a change", () => {
    render(<Probe />);

    snapshot = { ...idle, status: "running" };
    act(() => listener?.());

    expect(screen.getByRole("button")).toHaveTextContent("running");
  });

  it("exposes the end command to the page", async () => {
    render(<Probe />);

    await userEvent.click(screen.getByRole("button"));

    expect(launcher.end).toHaveBeenCalled();
  });

  /** One launcher per mount, so a re-render does not open a second overlay window. */
  it("keeps the same launcher across re-renders", () => {
    const { rerender } = render(<Probe />);

    rerender(<Probe />);

    expect(createSessionLauncher).toHaveBeenCalledTimes(1);
  });

  it("disposes the launcher when the page unmounts", () => {
    render(<Probe />).unmount();

    expect(launcher.dispose).toHaveBeenCalled();
  });

  it("relaunches for a different preset", () => {
    const { rerender } = render(<Probe />);

    rerender(<Probe presetId="preset-2" />);

    expect(launcher.dispose).toHaveBeenCalled();
    expect(launcher.start).toHaveBeenLastCalledWith("patient-1", "preset-2");
  });
});
