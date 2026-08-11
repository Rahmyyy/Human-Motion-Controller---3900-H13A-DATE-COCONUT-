import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { MappingViewData, ThresholdSaveState } from "@/modules/movement-mapping";
import PresetMappingCollection from "./PresetMappingCollection";

// The card has its own suite; here the grid, the delete dialog, and the plumbing are under test.
vi.mock("./PresetMappingCard", () => ({
  default: ({
    editTo,
    mapping,
    onThresholdChange,
    thresholdSaveState,
  }: {
    editTo: string;
    mapping: MappingViewData;
    onThresholdChange: (percentage: number) => void;
    thresholdSaveState: ThresholdSaveState;
  }) => (
    <div data-testid="card" data-edit-to={editTo} data-save-state={thresholdSaveState}>
      {mapping.name}
      <button type="button" onClick={() => onThresholdChange(85)}>
        set {mapping.name} threshold
      </button>
    </div>
  ),
}));

const mapping = (overrides: Partial<MappingViewData> = {}): MappingViewData => ({
  id: "mapping-1",
  name: "Left arm raise",
  keybind: "A",
  keypressType: "Click",
  poseFramesJson: "[]",
  poseFrames: [],
  selectedLandmarks: [],
  thresholdPercentage: 70,
  keypressTriggerThresholdPercentage: 60,
  ...overrides,
});

function renderCollection(
  overrides: Partial<React.ComponentProps<typeof PresetMappingCollection>> = {},
) {
  const onDelete = vi.fn(() => Promise.resolve(true));
  const onThresholdChange = vi.fn(() => Promise.resolve(true));
  const { rerender } = render(
    <PresetMappingCollection
      deletingMappingId={null}
      mappings={[mapping()]}
      onDelete={onDelete}
      onThresholdChange={onThresholdChange}
      patientId="patient-1"
      presetId="preset-1"
      thresholdSaveStates={{}}
      {...overrides}
    />,
  );
  return { onDelete, onThresholdChange, rerender };
}

const deleteButton = () => screen.getByRole("button", { name: "Delete Left arm raise" });

describe("PresetMappingCollection", () => {
  it("lays out a card per mapping, each linking to its editor", () => {
    renderCollection({ mappings: [mapping(), mapping({ id: "mapping-2", name: "Right kick" })] });

    expect(screen.getAllByTestId("card")).toHaveLength(2);
    expect(screen.getAllByTestId("card")[0]).toHaveAttribute(
      "data-edit-to",
      "/patients/patient-1/presets/preset-1/movements/mapping-1/edit",
    );
  });

  it("invites the first mapping when the preset is empty", () => {
    renderCollection({ mappings: [] });

    expect(
      screen.getByText('No mappings saved yet. Click "Add New Movement" to create one.'),
    ).toBeInTheDocument();
    expect(screen.queryByTestId("card")).not.toBeInTheDocument();
  });

  describe("threshold plumbing", () => {
    it("saves the threshold against the mapping it came from", async () => {
      const { onThresholdChange } = renderCollection();

      await userEvent.click(screen.getByRole("button", { name: "set Left arm raise threshold" }));

      expect(onThresholdChange).toHaveBeenCalledWith("mapping-1", 85);
    });

    it("passes each mapping's own save state to its card", () => {
      renderCollection({ thresholdSaveStates: { "mapping-1": "saved" } });

      expect(screen.getByTestId("card")).toHaveAttribute("data-save-state", "saved");
    });

    /** A mapping nobody has touched yet has no entry in the map, and reads as idle. */
    it("treats an untouched mapping as idle", () => {
      renderCollection();

      expect(screen.getByTestId("card")).toHaveAttribute("data-save-state", "idle");
    });
  });

  describe("deleting a mapping", () => {
    it("warns that the deletion cannot be undone", async () => {
      renderCollection();

      await userEvent.click(deleteButton());

      expect(screen.getByRole("dialog", { name: 'Delete "Left arm raise"?' })).toBeInTheDocument();
      expect(
        screen.getByText(
          "This will permanently remove this movement mapping and its keybind. This cannot be undone.",
        ),
      ).toBeInTheDocument();
    });

    it("deletes the mapping once confirmed", async () => {
      const { onDelete } = renderCollection();

      await userEvent.click(deleteButton());
      await userEvent.click(screen.getByRole("button", { name: "Delete" }));

      expect(onDelete).toHaveBeenCalledWith("mapping-1");
    });

    it("keeps the mapping when the clinician backs out", async () => {
      const { onDelete } = renderCollection();

      await userEvent.click(deleteButton());
      await userEvent.click(screen.getByRole("button", { name: "Cancel" }));

      expect(onDelete).not.toHaveBeenCalled();
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    /** A second click while the delete is in flight would fire the same removal twice. */
    it("locks the controls for the mapping being deleted", async () => {
      renderCollection({ deletingMappingId: "mapping-1" });

      expect(deleteButton()).toBeDisabled();
    });

    /** The dialog stays open across the write, so its button reports the progress. */
    it("reports the deletion in progress inside the dialog", async () => {
      const { rerender } = renderCollection();

      await userEvent.click(deleteButton());
      rerender(
        <PresetMappingCollection
          deletingMappingId="mapping-1"
          mappings={[mapping()]}
          onDelete={vi.fn(() => Promise.resolve(true))}
          onThresholdChange={vi.fn(() => Promise.resolve(true))}
          patientId="patient-1"
          presetId="preset-1"
          thresholdSaveStates={{}}
        />,
      );

      expect(screen.getByRole("button", { name: "Deleting…" })).toBeDisabled();
    });
  });
});
