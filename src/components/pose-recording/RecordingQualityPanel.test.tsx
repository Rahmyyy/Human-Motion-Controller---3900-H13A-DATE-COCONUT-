import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import RecordingQualityPanel from "./RecordingQualityPanel";
import { jointVisibility, quality } from "./testQuality";

/** The headline is the only place the three quality states are named to the clinician. */
function headline() {
  return screen.getByRole("heading", { level: 2 }).textContent;
}

describe("RecordingQualityPanel", () => {
  it("labels the panel for assistive technology", () => {
    render(<RecordingQualityPanel quality={quality()} />);

    expect(screen.getByRole("region", { name: "Recording quality" })).toBeInTheDocument();
  });

  describe("headline state", () => {
    it("reports a clean recording as good", () => {
      render(<RecordingQualityPanel quality={quality()} />);

      expect(headline()).toBe("Recording quality: Good");
      expect(screen.getByText(/enough consistently visible pose data/)).toBeInTheDocument();
    });

    /** A warning still saves — the clinician is told it may recognise inconsistently. */
    it("reports a marginal recording as needing attention but still saveable", () => {
      render(
        <RecordingQualityPanel
          quality={quality({ status: "warning", issues: ["low_usable_frame_coverage"] })}
        />,
      );

      expect(headline()).toBe("Recording quality: Needs attention");
      expect(screen.getByText(/enough data to save/)).toBeInTheDocument();
    });

    /** An empty capture usually means the camera mode is wrong, so that is what it says. */
    it("points at the camera when no pose data was captured at all", () => {
      render(
        <RecordingQualityPanel
          quality={quality({
            status: "unusable",
            totalFrames: 0,
            usableFrames: 0,
            usableFramePercentage: 0,
            issues: ["no_pose_frames"],
          })}
        />,
      );

      expect(headline()).toBe("Recording quality: Unusable");
      expect(screen.getByText(/Frontend camera mode is selected/)).toBeInTheDocument();
    });

    it("asks for a body point when none is selected", () => {
      render(
        <RecordingQualityPanel
          quality={quality({ status: "unusable", issues: ["no_landmarks_selected"] })}
        />,
      );

      expect(screen.getByText(/Select at least one body point before saving/)).toBeInTheDocument();
    });

    /** Frames are fine here — only the joint selection is wrong, so re-recording is optional. */
    it("blames the selection when the chosen joints miss the movement", () => {
      render(
        <RecordingQualityPanel
          quality={quality({ status: "unusable", issues: ["selection_misses_movement"] })}
        />,
      );

      expect(screen.getByText(/don't capture the movement in this recording/)).toBeInTheDocument();
    });

    /** With too few usable frames the selection advice would mislead: the capture is the problem. */
    it("blames the capture when frames are short even if the selection also misses", () => {
      render(
        <RecordingQualityPanel
          quality={quality({
            status: "unusable",
            issues: ["insufficient_usable_frames", "selection_misses_movement"],
          })}
        />,
      );

      expect(screen.getByText(/Reposition the camera and record again/)).toBeInTheDocument();
    });

    it("falls back to the reposition advice for a plain frame shortfall", () => {
      render(
        <RecordingQualityPanel
          quality={quality({ status: "unusable", issues: ["insufficient_usable_frames"] })}
        />,
      );

      expect(screen.getByText(/Reposition the camera and record again/)).toBeInTheDocument();
    });

    /** no_pose_frames wins over a simultaneous selection issue: there is nothing to select from. */
    it("prefers the empty-capture message over the selection message", () => {
      render(
        <RecordingQualityPanel
          quality={quality({
            status: "unusable",
            issues: ["no_pose_frames", "no_landmarks_selected"],
          })}
        />,
      );

      expect(screen.getByText(/Frontend camera mode is selected/)).toBeInTheDocument();
    });
  });

  describe("frame counts", () => {
    it("shows usable frames against the total as a rounded percentage", () => {
      render(
        <RecordingQualityPanel
          quality={quality({ totalFrames: 120, usableFrames: 91, usableFramePercentage: 0.7583 })}
        />,
      );

      expect(screen.getByText("120 frames usable (76%)", { exact: false })).toBeInTheDocument();
    });

    it("shows a zero percentage when nothing was captured", () => {
      render(
        <RecordingQualityPanel
          quality={quality({ totalFrames: 0, usableFrames: 0, usableFramePercentage: 0 })}
        />,
      );

      expect(screen.getByText(/0 of 0 frames usable \(0%\)/)).toBeInTheDocument();
    });
  });

  describe("joint visibility breakdown", () => {
    it("names every tracked joint with its rounded visibility", () => {
      render(
        <RecordingQualityPanel quality={quality({ jointVisibility: jointVisibility(0.5) })} />,
      );

      const details = screen.getByText("Joint visibility details").closest("details")!;
      for (const joint of ["Left shoulder", "Right ankle", "Left knee", "Right wrist"]) {
        expect(within(details).getByText(joint)).toBeInTheDocument();
      }
      expect(within(details).getAllByText("50%")).toHaveLength(12);
    });

    /** The breakdown is secondary detail, so it stays collapsed until asked for. */
    it("keeps the breakdown collapsed by default", () => {
      render(<RecordingQualityPanel quality={quality()} />);

      expect(screen.getByText("Joint visibility details").closest("details")).not.toHaveAttribute(
        "open",
      );
    });
  });
});
