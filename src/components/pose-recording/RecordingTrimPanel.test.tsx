import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { RecordingTrimRange } from "@/modules/pose-capture";
import RecordingTrimPanel from "./RecordingTrimPanel";

function renderPanel(trim: Partial<RecordingTrimRange> = {}) {
  const onChange = vi.fn();
  const range = { durationMs: 4000, startMs: 0, endMs: 4000, ...trim };
  render(<RecordingTrimPanel trim={range} onChange={onChange} />);
  return { onChange, range };
}

const startThumb = () => screen.getByRole("slider", { name: "Recording start time" });
const endThumb = () => screen.getByRole("slider", { name: "Recording end time" });

describe("RecordingTrimPanel", () => {
  it("labels the panel for assistive technology", () => {
    renderPanel();

    expect(screen.getByRole("region", { name: "Crop recording" })).toBeInTheDocument();
  });

  describe("readout", () => {
    it("shows the start, end, and selected length in seconds", () => {
      renderPanel({ startMs: 500, endMs: 3500 });

      expect(screen.getByText("Start: 0.5s")).toBeInTheDocument();
      expect(screen.getByText("End: 3.5s")).toBeInTheDocument();
      expect(screen.getByText("Selected: 3.0s of 4.0s")).toBeInTheDocument();
    });

    /** Milliseconds are the stored unit; a clinician reads tenths of a second. */
    it("rounds the readout to a tenth of a second", () => {
      renderPanel({ durationMs: 1234, startMs: 0, endMs: 1234 });

      expect(screen.getByText("End: 1.2s")).toBeInTheDocument();
    });
  });

  describe("restore control", () => {
    /** Nothing to restore while the whole recording is selected, so the button stays hidden. */
    it("stays hidden while the full recording is selected", () => {
      renderPanel();

      expect(screen.queryByRole("button", { name: "Restore" })).not.toBeInTheDocument();
    });

    it("appears once the start has been moved in", () => {
      renderPanel({ startMs: 500 });

      expect(screen.getByRole("button", { name: "Restore" })).toBeInTheDocument();
    });

    it("appears once the end has been moved in", () => {
      renderPanel({ endMs: 3500 });

      expect(screen.getByRole("button", { name: "Restore" })).toBeInTheDocument();
    });

    it("restores the full range without disturbing the duration", async () => {
      const { onChange } = renderPanel({ startMs: 500, endMs: 3500 });

      await userEvent.click(screen.getByRole("button", { name: "Restore" }));

      expect(onChange).toHaveBeenCalledWith({ durationMs: 4000, startMs: 0, endMs: 4000 });
    });

    /** It sits inside the recording form, where an implicit submit would save prematurely. */
    it("is not a submit button", () => {
      renderPanel({ startMs: 500 });

      expect(screen.getByRole("button", { name: "Restore" })).toHaveAttribute("type", "button");
    });
  });

  describe("range slider", () => {
    it("exposes the current range as two thumbs bounded by the recording", () => {
      renderPanel({ startMs: 500, endMs: 3500 });

      expect(startThumb()).toHaveAttribute("aria-valuenow", "500");
      expect(endThumb()).toHaveAttribute("aria-valuenow", "3500");
      expect(startThumb()).toHaveAttribute("aria-valuemin", "0");
      expect(endThumb()).toHaveAttribute("aria-valuemax", "4000");
    });

    it("reports a moved start handle while leaving the end alone", async () => {
      const { onChange } = renderPanel({ startMs: 500, endMs: 3500 });

      startThumb().focus();
      await userEvent.keyboard("{ArrowRight}");

      expect(onChange).toHaveBeenCalledWith({ durationMs: 4000, startMs: 501, endMs: 3500 });
    });

    it("reports a moved end handle while leaving the start alone", async () => {
      const { onChange } = renderPanel({ startMs: 500, endMs: 3500 });

      endThumb().focus();
      await userEvent.keyboard("{ArrowLeft}");

      expect(onChange).toHaveBeenCalledWith({ durationMs: 4000, startMs: 500, endMs: 3499 });
    });

    /** The handles must not cross, which would report an inverted range to the caller. */
    it("keeps the handles at least one step apart", async () => {
      const { onChange } = renderPanel({ startMs: 500, endMs: 501 });

      startThumb().focus();
      await userEvent.keyboard("{ArrowRight}");

      expect(onChange).not.toHaveBeenCalledWith(expect.objectContaining({ startMs: 501 }));
    });
  });
});
