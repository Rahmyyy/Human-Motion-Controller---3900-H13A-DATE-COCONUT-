import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { MappingEditorViewModel } from "@/modules/movement-mapping";
import type { RecordingState, RecordingTrimRange } from "@/modules/pose-capture";
import { editorViewModel, recordingQuality } from "../testEditor";
import MovementMappingWorkspace from "./MovementMappingWorkspace";

// Every panel has its own suite; here only the wiring between them and the editor is under test.
vi.mock("@/components/pose-recording/MovementCameraPanel", () => ({
  default: ({ recordingState }: { recordingState: RecordingState }) => (
    <div data-testid="camera" data-state={recordingState} />
  ),
}));
vi.mock("@/components/pose-recording/RecordingControls", () => ({
  default: ({ canSave }: { canSave: boolean }) => (
    <div data-testid="controls" data-can-save={canSave} />
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
vi.mock("./MappingDetailsPanel", () => ({
  default: ({ movementName }: { movementName: string }) => (
    <div data-testid="details" data-name={movementName} />
  ),
}));
vi.mock("./LandmarkSelectionPanel", () => ({
  default: ({ disabled, value }: { disabled: boolean; value: number[] }) => (
    <div data-testid="landmarks" data-disabled={disabled} data-count={value.length} />
  ),
}));
vi.mock("./KeypressTriggerThresholdPanel", () => ({
  default: ({ value }: { value: number }) => <div data-testid="threshold" data-value={value} />,
}));
vi.mock("./MovementMappingHeader", () => ({
  default: ({ title }: { title: string }) => <h1>{title}</h1>,
}));

const trim: RecordingTrimRange = { durationMs: 4000, startMs: 0, endMs: 4000 };

function renderWorkspace(overrides: Partial<MappingEditorViewModel> = {}) {
  render(
    <MovementMappingWorkspace
      editor={editorViewModel(overrides)}
      presentation={{
        backTo: "/patients/patient-1/presets/preset-1/edit",
        description: "Capture a physical movement and assign it to a keybind.",
        title: "Record and Map New Movement",
      }}
    />,
  );
}

describe("MovementMappingWorkspace", () => {
  it("heads the screen with the presentation it was given", () => {
    renderWorkspace();

    expect(
      screen.getByRole("heading", { name: "Record and Map New Movement" }),
    ).toBeInTheDocument();
  });

  it("hands the editor state to the panels that display it", () => {
    renderWorkspace({
      canSave: true,
      keypressTriggerThresholdPercentage: 85,
      movementName: "Left arm raise",
      recordingState: "recorded",
      selectedLandmarks: [11, 12],
    });

    expect(screen.getByTestId("camera")).toHaveAttribute("data-state", "recorded");
    expect(screen.getByTestId("details")).toHaveAttribute("data-name", "Left arm raise");
    expect(screen.getByTestId("landmarks")).toHaveAttribute("data-count", "2");
    expect(screen.getByTestId("threshold")).toHaveAttribute("data-value", "85");
    expect(screen.getByTestId("controls")).toHaveAttribute("data-can-save", "true");
  });

  describe("trim panel", () => {
    it("appears once a recording exists to crop", () => {
      renderWorkspace({ recordingState: "recorded", recordingTrim: trim });

      expect(screen.getByTestId("trim")).toHaveAttribute("data-duration", "4000");
    });

    /** Nothing has been captured yet mid-recording, so there is no range to crop. */
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

  // Changing the landmark set mid-capture would leave the frames and the selection disagreeing.
  describe("landmark selection", () => {
    it.each(["countdown", "recording"] as const)("is locked while %s", (recordingState) => {
      renderWorkspace({ recordingState });

      expect(screen.getByTestId("landmarks")).toHaveAttribute("data-disabled", "true");
    });

    it.each(["idle", "recorded"] as const)("stays editable while %s", (recordingState) => {
      renderWorkspace({ recordingState });

      expect(screen.getByTestId("landmarks")).toHaveAttribute("data-disabled", "false");
    });
  });

  describe("editor error", () => {
    it("shows the message the editor reported", () => {
      renderWorkspace({ error: "Give the movement a name before saving." });

      expect(screen.getByText("Give the movement a name before saving.")).toBeInTheDocument();
    });

    it("shows nothing while the editor is happy", () => {
      renderWorkspace();

      expect(screen.queryByText(/before saving/)).not.toBeInTheDocument();
    });
  });
});
