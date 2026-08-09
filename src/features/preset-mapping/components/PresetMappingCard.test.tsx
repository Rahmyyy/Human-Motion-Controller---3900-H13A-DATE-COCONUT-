import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { frame, frames } from "@/components/pose-recording/testFrames";
import {
  frameAtMovementThreshold,
  framesAtMovementThreshold,
  movementThresholdSettings,
  type MappingViewData,
} from "@/modules/movement-mapping";
import PresetMappingCard from "./PresetMappingCard";

// The threshold maths is the movement-mapping module's; the card only decides what to show.
vi.mock("@/modules/movement-mapping", () => ({
  frameAtMovementThreshold: vi.fn(),
  framesAtMovementThreshold: vi.fn(),
  movementThresholdSettings: vi.fn(),
}));
vi.mock("./MappingPosePreview", () => ({
  default: ({
    frames,
    previewFrame,
  }: {
    frames: unknown[];
    previewFrame: { id?: string } | null;
  }) => (
    <div data-testid="preview" data-count={frames.length} data-scrubbed={Boolean(previewFrame)} />
  ),
}));
// The real control is a Radix slider that commits on the same keystroke it changes on; separate
// buttons let the card's draft state be observed between the two.
vi.mock("./MovementThresholdControl", () => ({
  default: ({
    minimum,
    onValueChange,
    onValueCommit,
    value,
  }: {
    minimum: number;
    onValueChange: (percentage: number) => void;
    onValueCommit: (percentage: number) => void;
    value: number;
  }) => (
    <div data-testid="threshold" data-minimum={minimum} data-value={value}>
      <button type="button" onClick={() => onValueChange(85)}>
        drag to 85
      </button>
      <button type="button" onClick={() => onValueCommit(85)}>
        commit 85
      </button>
      <button type="button" onClick={() => onValueCommit(70)}>
        commit 70
      </button>
    </div>
  ),
}));

const mapping: MappingViewData = {
  id: "mapping-1",
  name: "Left arm raise",
  keybind: "A",
  keypressType: "Click",
  poseFramesJson: "[]",
  poseFrames: frames(0, 100, 200),
  selectedLandmarks: [],
  thresholdPercentage: 70,
  keypressTriggerThresholdPercentage: 60,
};

function renderCard(settings: { effectivePercentage: number; minimumPercentage: number } | null) {
  vi.mocked(movementThresholdSettings).mockReturnValue(settings);
  const onThresholdChange = vi.fn();
  render(
    <MemoryRouter>
      <PresetMappingCard
        editTo="/patients/patient-1/presets/preset-1/movements/mapping-1/edit"
        mapping={mapping}
        onThresholdChange={onThresholdChange}
        thresholdSaveState="idle"
      />
    </MemoryRouter>,
  );
  return { onThresholdChange };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(framesAtMovementThreshold).mockReturnValue(frames(0, 100));
  vi.mocked(frameAtMovementThreshold).mockReturnValue(frame(100));
});

describe("PresetMappingCard", () => {
  it("names the movement and the key it fires", () => {
    renderCard({ effectivePercentage: 70, minimumPercentage: 40 });

    expect(screen.getByText("Left arm raise")).toBeInTheDocument();
    expect(screen.getByText("A")).toBeInTheDocument();
  });

  it("opens the mapping editor when the card is followed", () => {
    renderCard({ effectivePercentage: 70, minimumPercentage: 40 });

    expect(screen.getByRole("link", { name: "Edit Left arm raise" })).toHaveAttribute(
      "href",
      "/patients/patient-1/presets/preset-1/movements/mapping-1/edit",
    );
  });

  describe("threshold control", () => {
    it("offers the control on the settings the analysis returned", () => {
      renderCard({ effectivePercentage: 70, minimumPercentage: 40 });

      expect(screen.getByTestId("threshold")).toHaveAttribute("data-minimum", "40");
      expect(screen.getByTestId("threshold")).toHaveAttribute("data-value", "70");
    });

    /** A still pose has no movement to trim, so there is no threshold to offer. */
    it("stays hidden when the movement has no measurable range", () => {
      renderCard(null);

      expect(screen.queryByTestId("threshold")).not.toBeInTheDocument();
    });

    it("replays the untrimmed recording when there is no threshold", () => {
      renderCard(null);

      expect(framesAtMovementThreshold).not.toHaveBeenCalled();
      expect(screen.getByTestId("preview")).toHaveAttribute("data-count", "3");
    });
  });

  describe("while the threshold is being dragged", () => {
    it("shows the dragged value and scrubs the preview to it", async () => {
      renderCard({ effectivePercentage: 70, minimumPercentage: 40 });

      await userEvent.click(screen.getByRole("button", { name: "drag to 85" }));

      expect(screen.getByTestId("threshold")).toHaveAttribute("data-value", "85");
      expect(screen.getByTestId("preview")).toHaveAttribute("data-scrubbed", "true");
      expect(frameAtMovementThreshold).toHaveBeenCalledWith(mapping.poseFrames, 85);
    });

    /** Letting go returns to a free-running replay of the trimmed movement. */
    it("stops scrubbing once the drag is committed", async () => {
      renderCard({ effectivePercentage: 70, minimumPercentage: 40 });

      await userEvent.click(screen.getByRole("button", { name: "drag to 85" }));
      await userEvent.click(screen.getByRole("button", { name: "commit 85" }));

      expect(screen.getByTestId("preview")).toHaveAttribute("data-scrubbed", "false");
    });
  });

  describe("committing a threshold", () => {
    it("saves a value the clinician actually changed", async () => {
      const { onThresholdChange } = renderCard({ effectivePercentage: 70, minimumPercentage: 40 });

      await userEvent.click(screen.getByRole("button", { name: "commit 85" }));

      expect(onThresholdChange).toHaveBeenCalledWith(85);
    });

    /** Nudging the slider back to where it started is not an edit worth a database write. */
    it("skips the save when the value came back to the saved one", async () => {
      const { onThresholdChange } = renderCard({ effectivePercentage: 70, minimumPercentage: 40 });

      await userEvent.click(screen.getByRole("button", { name: "commit 70" }));

      expect(onThresholdChange).not.toHaveBeenCalled();
    });
  });
});
