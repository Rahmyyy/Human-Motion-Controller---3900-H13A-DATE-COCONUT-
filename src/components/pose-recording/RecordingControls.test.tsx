import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { RecordingState } from "@/modules/pose-capture";
import RecordingControls from "./RecordingControls";

/** One spy per callback so a test can assert that exactly the intended one fired. */
function handlers() {
  return {
    onCancel: vi.fn(),
    onReRecord: vi.fn(),
    onSave: vi.fn(),
    onStart: vi.fn(),
    onStop: vi.fn(),
  };
}

function renderControls(state: RecordingState, overrides: Partial<{ canSave: boolean }> = {}) {
  const spies = handlers();
  render(<RecordingControls state={state} canSave={overrides.canSave ?? true} {...spies} />);
  return spies;
}

describe("RecordingControls", () => {
  describe("before recording starts", () => {
    it("offers only the start action", () => {
      renderControls("idle");

      expect(screen.getByRole("button", { name: "Start Recording" })).toBeInTheDocument();
      expect(screen.getAllByRole("button")).toHaveLength(1);
    });

    it("starts recording when the start button is pressed", async () => {
      const spies = renderControls("idle");

      await userEvent.click(screen.getByRole("button"));

      expect(spies.onStart).toHaveBeenCalledOnce();
      expect(spies.onStop).not.toHaveBeenCalled();
    });

    /** Preset and mapping screens reuse this control with their own wording. */
    it("uses a caller-supplied start label", () => {
      render(
        <RecordingControls state="idle" canSave startLabel="Record calibration" {...handlers()} />,
      );

      expect(screen.getByRole("button", { name: "Record calibration" })).toBeInTheDocument();
    });
  });

  describe("during the countdown", () => {
    it("offers only the cancel action", () => {
      renderControls("countdown");

      expect(screen.getByRole("button", { name: "Cancel Countdown" })).toBeInTheDocument();
      expect(screen.getAllByRole("button")).toHaveLength(1);
    });

    it("cancels the countdown when pressed", async () => {
      const spies = renderControls("countdown");

      await userEvent.click(screen.getByRole("button"));

      expect(spies.onCancel).toHaveBeenCalledOnce();
    });
  });

  describe("while recording", () => {
    it("offers only the stop action", () => {
      renderControls("recording");

      expect(screen.getByRole("button", { name: "Stop Recording" })).toBeInTheDocument();
      expect(screen.getAllByRole("button")).toHaveLength(1);
    });

    it("stops the recording when pressed", async () => {
      const spies = renderControls("recording");

      await userEvent.click(screen.getByRole("button"));

      expect(spies.onStop).toHaveBeenCalledOnce();
      expect(spies.onStart).not.toHaveBeenCalled();
    });
  });

  describe("once a recording exists", () => {
    it("offers both saving and re-recording", () => {
      renderControls("recorded");

      expect(screen.getByRole("button", { name: "Save Mapping" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Re-record" })).toBeInTheDocument();
    });

    it("saves when the save button is pressed", async () => {
      const spies = renderControls("recorded");

      await userEvent.click(screen.getByRole("button", { name: "Save Mapping" }));

      expect(spies.onSave).toHaveBeenCalledOnce();
    });

    it("discards and restarts when re-record is pressed", async () => {
      const spies = renderControls("recorded");

      await userEvent.click(screen.getByRole("button", { name: "Re-record" }));

      expect(spies.onReRecord).toHaveBeenCalledOnce();
      expect(spies.onSave).not.toHaveBeenCalled();
    });

    /** An unusable recording can still be re-recorded, so only saving is blocked. */
    it("disables saving but not re-recording when the recording cannot be saved", async () => {
      const spies = renderControls("recorded", { canSave: false });

      const save = screen.getByRole("button", { name: "Save Mapping" });
      expect(save).toBeDisabled();
      await userEvent.click(save);
      expect(spies.onSave).not.toHaveBeenCalled();

      expect(screen.getByRole("button", { name: "Re-record" })).toBeEnabled();
    });

    it("uses a caller-supplied save label", () => {
      render(
        <RecordingControls state="recorded" canSave saveLabel="Save preset" {...handlers()} />,
      );

      expect(screen.getByRole("button", { name: "Save preset" })).toBeInTheDocument();
    });
  });

  /** These live inside forms; an implicit submit type would post the form instead. */
  it("never renders an implicit submit button", () => {
    for (const state of ["idle", "countdown", "recording", "recorded"] as const) {
      const { unmount } = render(<RecordingControls state={state} canSave {...handlers()} />);

      for (const button of screen.getAllByRole("button")) {
        expect(button).toHaveAttribute("type", "button");
      }

      unmount();
    }
  });
});
