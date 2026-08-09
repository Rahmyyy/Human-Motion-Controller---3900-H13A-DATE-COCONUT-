import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { PoseFrame } from "@/modules/pose-capture";
import { frame, frames } from "@/components/pose-recording/testFrames";
import MappingPosePreview from "./MappingPosePreview";

// The replay owns a canvas animation loop and has its own suite; only the swap is tested here.
vi.mock("@/components/pose-recording/PoseReplay", () => ({
  default: ({ frames, previewFrame }: { frames: PoseFrame[]; previewFrame: PoseFrame | null }) => (
    <div
      data-testid="replay"
      data-frame-count={frames.length}
      data-preview={previewFrame?.timestampMs ?? "none"}
    />
  ),
}));

describe("MappingPosePreview", () => {
  it("replays the recorded movement", () => {
    render(<MappingPosePreview frames={frames(0, 100, 200)} />);

    expect(screen.getByTestId("replay")).toHaveAttribute("data-frame-count", "3");
  });

  /** A mapping saved before frames were stored has nothing to replay, but must still render. */
  it("says the preview is unavailable when there are no frames", () => {
    render(<MappingPosePreview frames={[]} />);

    expect(screen.getByText("Preview unavailable")).toBeInTheDocument();
    expect(screen.queryByTestId("replay")).not.toBeInTheDocument();
  });

  /** While the threshold slider is being dragged the replay holds a single scrubbed frame. */
  it("passes a scrubbed preview frame through to the replay", () => {
    render(<MappingPosePreview frames={frames(0, 100)} previewFrame={frame(100)} />);

    expect(screen.getByTestId("replay")).toHaveAttribute("data-preview", "100");
  });

  it("replays freely when no preview frame is pinned", () => {
    render(<MappingPosePreview frames={frames(0, 100)} />);

    expect(screen.getByTestId("replay")).toHaveAttribute("data-preview", "none");
  });
});
