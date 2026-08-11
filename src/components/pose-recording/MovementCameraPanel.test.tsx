import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { RecordingState } from "@/modules/pose-capture";
import MovementCameraPanel from "./MovementCameraPanel";
import { frames } from "./testFrames";

// The live preview owns a camera and the MediaPipe model, and the replay owns a canvas loop.
// Both are covered by their own suites; here only the swap between them is under test.
vi.mock("@/features/camera/MediaPipePosePreview", () => ({
  default: () => <div data-testid="live-preview" />,
}));
vi.mock("./PoseReplay", () => ({
  default: ({ frames }: { frames: unknown[] }) => (
    <div data-testid="replay" data-frame-count={frames.length} />
  ),
}));

function renderPanel(recordingState: RecordingState, countdownSeconds: number | null = null) {
  return render(
    <MovementCameraPanel
      countdownSeconds={countdownSeconds}
      frames={frames(0, 100, 200)}
      recordingState={recordingState}
    />,
  );
}

describe("MovementCameraPanel", () => {
  it("labels the panel for assistive technology", () => {
    renderPanel("idle");

    expect(screen.getByRole("region", { name: "Movement camera preview" })).toBeInTheDocument();
  });

  it.each(["idle", "countdown", "recording"] as const)(
    "shows the live camera while %s",
    (state) => {
      renderPanel(state, 3);

      expect(screen.getByTestId("live-preview")).toBeInTheDocument();
      expect(screen.queryByTestId("replay")).not.toBeInTheDocument();
    },
  );

  /** Once capture stops the camera gives way to the recording the clinician just made. */
  it("swaps the live camera for the replay once a recording exists", () => {
    renderPanel("recorded");

    expect(screen.getByTestId("replay")).toHaveAttribute("data-frame-count", "3");
    expect(screen.queryByTestId("live-preview")).not.toBeInTheDocument();
  });

  it("overlays the countdown only during the countdown", () => {
    const { rerender } = renderPanel("countdown", 3);
    expect(screen.getByText("3")).toBeInTheDocument();

    rerender(
      <MovementCameraPanel countdownSeconds={3} frames={frames(0)} recordingState="recording" />,
    );

    expect(screen.queryByText("Get ready")).not.toBeInTheDocument();
  });

  /** The countdown clears to null on its final tick, which must still read as one second left
   *  rather than a blank overlay. */
  it("falls back to one second when the countdown value has already cleared", () => {
    renderPanel("countdown", null);

    expect(screen.getByText("1")).toBeInTheDocument();
    expect(screen.getByText("Get ready")).toBeInTheDocument();
  });
});
