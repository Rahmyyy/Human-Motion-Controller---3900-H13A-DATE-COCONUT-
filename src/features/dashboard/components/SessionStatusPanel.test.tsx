import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useSession } from "@/features/session/hooks/useSession";
import type { SessionStatus } from "@/modules/live-session";
import SessionStatusPanel from "./SessionStatusPanel";

vi.mock("@/features/session/hooks/useSession", () => ({ useSession: vi.fn() }));

const endSession = vi.fn();
const startSession = vi.fn();

function renderPanel(status: SessionStatus, elapsedMs = 0) {
  vi.mocked(useSession).mockReturnValue({
    status,
    startedAt: status === "idle" ? null : 0,
    endedAt: status === "ended" ? elapsedMs : null,
    elapsedMs,
    triggerCount: 0,
    triggerCountsByMapping: {},
    endSession,
    startSession,
  });
  return render(<SessionStatusPanel />);
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("SessionStatusPanel", () => {
  it("titles itself and says what it reports", () => {
    renderPanel("idle");

    expect(screen.getByRole("heading", { name: "Session Status" })).toBeInTheDocument();
    expect(screen.getByText("Current state and elapsed time.")).toBeInTheDocument();
  });

  describe("status readout", () => {
    it.each([
      ["idle", "Idle"],
      ["running", "Running"],
      ["ended", "Ended"],
    ] as const)("reads %s as %s", (status, text) => {
      renderPanel(status);

      expect(screen.getByText(text)).toBeInTheDocument();
    });
  });

  describe("duration readout", () => {
    it("shows a zeroed clock before the session starts", () => {
      renderPanel("idle");

      expect(screen.getByText("00:00")).toBeInTheDocument();
    });

    it("shows minutes and seconds padded to two digits", () => {
      renderPanel("running", 65_000);

      expect(screen.getByText("01:05")).toBeInTheDocument();
    });

    /** Elapsed time arrives in milliseconds; part-seconds must round down, not up. */
    it("drops the part-second rather than rounding it up", () => {
      renderPanel("running", 1_999);

      expect(screen.getByText("00:01")).toBeInTheDocument();
    });

    it("keeps counting past an hour in minutes", () => {
      renderPanel("ended", 3_723_000);

      expect(screen.getByText("62:03")).toBeInTheDocument();
    });
  });

  describe("start and stop control", () => {
    it("offers to start an idle session", async () => {
      renderPanel("idle");

      await userEvent.click(screen.getByRole("button", { name: "Start" }));

      expect(startSession).toHaveBeenCalled();
    });

    it("offers to stop a running session", async () => {
      renderPanel("running");

      await userEvent.click(screen.getByRole("button", { name: "Stop" }));

      expect(endSession).toHaveBeenCalled();
    });

    /** An ended session can be run again, so the control returns to Start. */
    it("offers to start again once the session has ended", async () => {
      renderPanel("ended");

      await userEvent.click(screen.getByRole("button", { name: "Start" }));

      expect(startSession).toHaveBeenCalled();
    });

    /** Stopping a live session is the destructive action and is styled to say so. */
    it("marks the stop control as destructive and the start control as ordinary", () => {
      const { unmount } = renderPanel("running");
      expect(screen.getByRole("button", { name: "Stop" })).toHaveAttribute(
        "data-variant",
        "destructive",
      );
      unmount();

      renderPanel("idle");

      expect(screen.getByRole("button", { name: "Start" })).toHaveAttribute(
        "data-variant",
        "outline",
      );
    });
  });
});
