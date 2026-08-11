import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, expect, it, vi } from "vitest";
import type { DefaultPoseCalibrationViewModel } from "@/modules/patient-presets";
import type { RecordingState, RecordingTrimRange } from "@/modules/pose-capture";
import { recordingQuality } from "@/features/movement-mapping/testEditor";
import { calibrationViewModel } from "../testPresets";
import DefaultPoseCalibrationWorkspace from "./DefaultPoseCalibrationWorkspace";

// The camera, controls and analysis panels all have their own suites.
vi.mock("@/components/pose-recording/MovementCameraPanel", () => ({
  default: ({ recordingState }: { recordingState: RecordingState }) => (
    <div data-testid="camera" data-state={recordingState} />
  ),
}));
vi.mock("@/components/pose-recording/RecordingControls", () => ({
  default: ({ saveLabel, startLabel }: { saveLabel: string; startLabel: string }) => (
    <div data-testid="controls" data-save-label={saveLabel} data-start-label={startLabel} />
  ),
}));
vi.mock("@/components/pose-recording/RecordingQualityPanel", () => ({
  default: () => <div data-testid="quality" />,
}));
vi.mock("@/components/pose-recording/RecordingTrimPanel", () => ({
  default: ({ trim }: { trim: RecordingTrimRange }) => (
    <div data-testid="trim" data-duration={trim.durationMs} />
  ),
}));

const trim: RecordingTrimRange = { durationMs: 4000, startMs: 0, endMs: 4000 };

function renderWorkspace(overrides: Partial<DefaultPoseCalibrationViewModel> = {}) {
  render(
    <MemoryRouter>
      <DefaultPoseCalibrationWorkspace
        backTo="/patients/patient-1/presets/preset-1/edit"
        calibration={calibrationViewModel(overrides)}
      />
    </MemoryRouter>,
  );
}

describe("DefaultPoseCalibrationWorkspace", () => {
  it("titles the screen and says what the calibration is for", () => {
    renderWorkspace();

    expect(
      screen.getByRole("heading", { name: "Record Default Resting State", level: 1 }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Ask the patient to remain comfortably still in their normal resting position. This calibration helps recognition separate rest from intentional movement.",
      ),
    ).toBeInTheDocument();
  });

  /** Calibration has its own wording; the shared controls are relabelled for it. */
  it("relabels the shared controls for calibration", () => {
    renderWorkspace();

    expect(screen.getByTestId("controls")).toHaveAttribute("data-start-label", "Start Calibration");
    expect(screen.getByTestId("controls")).toHaveAttribute("data-save-label", "Save Default State");
  });

  it("tells the clinician how long to record and when to redo it", () => {
    renderWorkspace();

    expect(
      screen.getByText(
        "Record at least one second with the patient fully visible. Re-record this calibration if the camera position or the patient's resting posture changes significantly.",
      ),
    ).toBeInTheDocument();
  });

  it("shows the camera in the current recording state", () => {
    renderWorkspace({ recordingState: "recording" });

    expect(screen.getByTestId("camera")).toHaveAttribute("data-state", "recording");
  });

  it("offers a way back to the preset", () => {
    renderWorkspace();

    expect(screen.getByRole("button", { name: "Back" })).toBeInTheDocument();
  });

  describe("trim panel", () => {
    it("appears once a recording exists to crop", () => {
      renderWorkspace({ recordingState: "recorded", recordingTrim: trim });

      expect(screen.getByTestId("trim")).toHaveAttribute("data-duration", "4000");
    });

    it("stays hidden while the recording is still running", () => {
      renderWorkspace({ recordingState: "recording", recordingTrim: trim });

      expect(screen.queryByTestId("trim")).not.toBeInTheDocument();
    });

    it("stays hidden when the recording has no trim range", () => {
      renderWorkspace({ recordingState: "recorded", recordingTrim: null });

      expect(screen.queryByTestId("trim")).not.toBeInTheDocument();
    });
  });

  describe("quality panel", () => {
    it("appears once the recording has been analysed", () => {
      renderWorkspace({ recordingQuality });

      expect(screen.getByTestId("quality")).toBeInTheDocument();
    });

    it("stays hidden until there is something to analyse", () => {
      renderWorkspace();

      expect(screen.queryByTestId("quality")).not.toBeInTheDocument();
    });
  });

  describe("calibration error", () => {
    it("shows the message the service reported", () => {
      renderWorkspace({ error: "Recording is too short to calibrate." });

      expect(screen.getByText("Recording is too short to calibrate.")).toBeInTheDocument();
    });

    it("shows nothing while the calibration is happy", () => {
      renderWorkspace();

      expect(screen.queryByText(/too short/)).not.toBeInTheDocument();
    });
  });
});
