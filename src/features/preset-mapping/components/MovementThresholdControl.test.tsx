import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { ThresholdSaveState } from "@/modules/movement-mapping";
import MovementThresholdControl from "./MovementThresholdControl";

function renderControl(
  overrides: Partial<React.ComponentProps<typeof MovementThresholdControl>> = {},
) {
  const onValueChange = vi.fn();
  const onValueCommit = vi.fn();
  render(
    <MovementThresholdControl
      minimum={40}
      movementName="Left arm raise"
      onValueChange={onValueChange}
      onValueCommit={onValueCommit}
      saveState="idle"
      value={70}
      {...overrides}
    />,
  );
  return { onValueChange, onValueCommit };
}

const slider = () => screen.getByRole("slider", { name: "Left arm raise completion threshold" });

describe("MovementThresholdControl", () => {
  it("labels the section with the movement it belongs to", () => {
    renderControl();

    expect(
      screen.getByRole("region", { name: "Left arm raise movement threshold" }),
    ).toBeInTheDocument();
  });

  it("shows the current percentage", () => {
    renderControl();

    expect(screen.getByText("70%")).toBeInTheDocument();
  });

  /** Below the safe minimum the clipped movement is no longer recognisable, so it is the floor. */
  it("bounds the slider between the safe minimum and a full movement", () => {
    renderControl();

    expect(slider()).toHaveAttribute("aria-valuemin", "40");
    expect(slider()).toHaveAttribute("aria-valuemax", "100");
    expect(slider()).toHaveAttribute("aria-valuenow", "70");
    expect(screen.getByText("Safe minimum 40%")).toBeInTheDocument();
    expect(screen.getByText("Full movement 100%")).toBeInTheDocument();
  });

  describe("adjusting", () => {
    it("reports the nudged value as it changes and again on commit", async () => {
      const { onValueChange, onValueCommit } = renderControl();

      slider().focus();
      await userEvent.keyboard("{ArrowRight}");

      expect(onValueChange).toHaveBeenCalledWith(71);
      expect(onValueCommit).toHaveBeenCalledWith(71);
    });

    it("refuses to go below the safe minimum", async () => {
      const { onValueChange } = renderControl({ value: 40 });

      slider().focus();
      await userEvent.keyboard("{ArrowLeft}");

      expect(onValueChange).not.toHaveBeenCalled();
    });

    // A movement only recognisable at full extent has nothing left to trade away, so the control
    // locks itself at `minimum === 100`. That case is not tested here: a zero-width range makes
    // Radix compute a non-finite thumb offset, and jsdom's CSS parser throws on it during render
    // where a browser would simply ignore the declaration.
  });

  describe("save feedback", () => {
    it.each([
      ["saving", "Saving…"],
      ["saved", "Saved"],
      ["error", "Save failed"],
    ] as const)("reports the %s state", (saveState: ThresholdSaveState, text) => {
      renderControl({ saveState });

      expect(screen.getByText(text)).toBeInTheDocument();
    });

    /** Nothing has been written yet, so an untouched control stays silent. */
    it("says nothing while idle", () => {
      renderControl();

      expect(screen.queryByText(/Saving|Saved|Save failed/)).not.toBeInTheDocument();
    });
  });
});
