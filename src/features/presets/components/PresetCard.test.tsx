import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { describe, expect, it, vi } from "vitest";
import { preset } from "../testPresets";
import PresetCard from "./PresetCard";

// Both dialogs have their own suites; the card only has to wire each one to the right preset.
vi.mock("./DeletePresetDialog", () => ({
  default: ({ error, isDeleting }: { error: string | null; isDeleting: boolean }) => (
    <div data-testid="delete-dialog" data-error={error ?? "none"} data-deleting={isDeleting} />
  ),
}));
vi.mock("./DuplicatePresetDialog", () => ({
  default: ({ error, isDuplicating }: { error: string | null; isDuplicating: boolean }) => (
    <div
      data-testid="duplicate-dialog"
      data-error={error ?? "none"}
      data-duplicating={isDuplicating}
    />
  ),
}));

function renderCard(props: Partial<React.ComponentProps<typeof PresetCard>> = {}) {
  const onSelect = vi.fn();
  render(
    <MemoryRouter>
      <PresetCard
        deleteError={null}
        duplicateError={null}
        isDeleting={false}
        isDuplicating={false}
        isSelected={false}
        onClearDeleteError={vi.fn()}
        onClearDuplicateError={vi.fn()}
        onDelete={vi.fn(() => Promise.resolve(true))}
        onDuplicate={vi.fn(() => Promise.resolve(preset()))}
        onSelect={onSelect}
        preset={preset()}
        {...props}
      />
    </MemoryRouter>,
  );
  return { onSelect };
}

describe("PresetCard", () => {
  it("names the preset and counts its mappings", () => {
    renderCard();

    expect(screen.getByRole("heading", { name: "Mario Kart" })).toBeInTheDocument();
    expect(screen.getByText("3 mappings")).toBeInTheDocument();
  });

  it("uses the singular for a preset with one mapping", () => {
    renderCard({ preset: preset({ mappingCount: 1 }) });

    expect(screen.getByText("1 mapping")).toBeInTheDocument();
  });

  it("links to the preset's mappings", () => {
    renderCard();

    expect(screen.getByRole("link", { name: "Edit Mario Kart mappings" })).toHaveAttribute(
      "href",
      "/patients/patient-1/presets/preset-1/edit",
    );
  });

  describe("selection", () => {
    it("offers to select an unselected preset", async () => {
      const { onSelect } = renderCard();

      const button = screen.getByRole("button", { name: "Select Mario Kart" });
      expect(button).toHaveAttribute("aria-pressed", "false");
      await userEvent.click(button);

      expect(onSelect).toHaveBeenCalled();
    });

    /** The selected card is the one the action bar acts on, so it says so plainly. */
    it("marks the selected preset and offers to unselect it", () => {
      renderCard({ isSelected: true });

      const button = screen.getByRole("button", { name: "Unselect Mario Kart" });
      expect(button).toHaveAttribute("aria-pressed", "true");
      expect(button).toHaveAttribute("data-variant", "default");
    });

    it("styles an unselected preset as secondary", () => {
      renderCard();

      expect(screen.getByRole("button", { name: "Select Mario Kart" })).toHaveAttribute(
        "data-variant",
        "secondary",
      );
    });
  });

  describe("row dialogs", () => {
    it("passes each mutation's own state to its dialog", () => {
      renderCard({
        deleteError: "Preset is in use.",
        duplicateError: "Name already taken.",
        isDeleting: true,
        isDuplicating: true,
      });

      expect(screen.getByTestId("delete-dialog")).toHaveAttribute(
        "data-error",
        "Preset is in use.",
      );
      expect(screen.getByTestId("delete-dialog")).toHaveAttribute("data-deleting", "true");
      expect(screen.getByTestId("duplicate-dialog")).toHaveAttribute(
        "data-error",
        "Name already taken.",
      );
      expect(screen.getByTestId("duplicate-dialog")).toHaveAttribute("data-duplicating", "true");
    });

    it("reports no error while both mutations are quiet", () => {
      renderCard();

      expect(screen.getByTestId("delete-dialog")).toHaveAttribute("data-error", "none");
      expect(screen.getByTestId("duplicate-dialog")).toHaveAttribute("data-error", "none");
    });
  });
});
