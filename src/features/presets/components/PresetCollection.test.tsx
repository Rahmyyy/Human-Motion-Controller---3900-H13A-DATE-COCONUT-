import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { Preset } from "@/modules/patient-presets";
import { preset } from "../testPresets";
import PresetCollection from "./PresetCollection";

// The card has its own suite; here only the grid and the per-preset routing are under test.
vi.mock("./PresetCard", () => ({
  default: ({
    deleteError,
    duplicateError,
    isDeleting,
    isDuplicating,
    isSelected,
    onSelect,
    preset,
  }: {
    deleteError: string | null;
    duplicateError: string | null;
    isDeleting: boolean;
    isDuplicating: boolean;
    isSelected: boolean;
    onSelect: () => void;
    preset: Preset;
  }) => (
    <div
      data-testid="card"
      data-name={preset.name}
      data-selected={isSelected}
      data-deleting={isDeleting}
      data-duplicating={isDuplicating}
      data-delete-error={deleteError ?? "none"}
      data-duplicate-error={duplicateError ?? "none"}
    >
      <button type="button" onClick={onSelect}>
        select {preset.name}
      </button>
    </div>
  ),
}));

const presets = [preset(), preset({ id: "preset-2", name: "Tennis" })];

function renderCollection(props: Partial<React.ComponentProps<typeof PresetCollection>> = {}) {
  const onSelectPreset = vi.fn();
  render(
    <PresetCollection
      deleteError={null}
      deletingPresetId={null}
      duplicateError={null}
      duplicatingPresetId={null}
      onClearDeleteError={vi.fn()}
      onClearDuplicateError={vi.fn()}
      onDeletePreset={vi.fn(() => Promise.resolve(true))}
      onDuplicatePreset={vi.fn(() => Promise.resolve(preset()))}
      onSelectPreset={onSelectPreset}
      presets={presets}
      selectedPresetId={null}
      {...props}
    />,
  );
  return { onSelectPreset };
}

const cardFor = (name: string) =>
  screen.getAllByTestId("card").find((card) => card.dataset.name === name);

describe("PresetCollection", () => {
  it("lays out a card per preset", () => {
    renderCollection();

    expect(screen.getAllByTestId("card")).toHaveLength(2);
  });

  it("invites the first preset when the patient has none", () => {
    renderCollection({ presets: [] });

    expect(
      screen.getByText("No presets saved yet. Create one to get started."),
    ).toBeInTheDocument();
    expect(screen.queryByTestId("card")).not.toBeInTheDocument();
  });

  it("reports the selected preset by id", async () => {
    const { onSelectPreset } = renderCollection();

    await userEvent.click(screen.getByRole("button", { name: "select Tennis" }));

    expect(onSelectPreset).toHaveBeenCalledWith("preset-2");
  });

  it("marks only the selected card", () => {
    renderCollection({ selectedPresetId: "preset-2" });

    expect(cardFor("Tennis")).toHaveAttribute("data-selected", "true");
    expect(cardFor("Mario Kart")).toHaveAttribute("data-selected", "false");
  });

  // Errors and in-flight writes belong to one preset, so they must not leak across the grid.
  describe("per-preset state", () => {
    it("marks only the preset being deleted", () => {
      renderCollection({ deletingPresetId: "preset-1" });

      expect(cardFor("Mario Kart")).toHaveAttribute("data-deleting", "true");
      expect(cardFor("Tennis")).toHaveAttribute("data-deleting", "false");
    });

    it("marks only the preset being duplicated", () => {
      renderCollection({ duplicatingPresetId: "preset-2" });

      expect(cardFor("Tennis")).toHaveAttribute("data-duplicating", "true");
      expect(cardFor("Mario Kart")).toHaveAttribute("data-duplicating", "false");
    });

    it("shows a delete error only on the preset it belongs to", () => {
      renderCollection({
        deleteError: { presetId: "preset-1", message: "Preset is in use." },
      });

      expect(cardFor("Mario Kart")).toHaveAttribute("data-delete-error", "Preset is in use.");
      expect(cardFor("Tennis")).toHaveAttribute("data-delete-error", "none");
    });

    it("shows a duplicate error only on the preset it belongs to", () => {
      renderCollection({
        duplicateError: { presetId: "preset-2", message: "Name already taken." },
      });

      expect(cardFor("Tennis")).toHaveAttribute("data-duplicate-error", "Name already taken.");
      expect(cardFor("Mario Kart")).toHaveAttribute("data-duplicate-error", "none");
    });
  });
});
