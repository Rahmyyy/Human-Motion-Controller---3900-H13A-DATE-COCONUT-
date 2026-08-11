import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import KeypressTriggerThresholdPanel from "./KeypressTriggerThresholdPanel";

function renderPanel(value = 60) {
  const onChange = vi.fn();
  render(<KeypressTriggerThresholdPanel value={value} onChange={onChange} />);
  return { onChange };
}

const slider = () => screen.getByRole("slider", { name: "Keypress trigger threshold percentage" });

describe("KeypressTriggerThresholdPanel", () => {
  it("titles itself and marks the setting optional", () => {
    renderPanel();

    expect(screen.getByRole("heading", { name: /Keypress Trigger Threshold/ })).toBeInTheDocument();
    expect(screen.getByText("Optional")).toBeInTheDocument();
  });

  /** The summary stays visible while the section is collapsed, so it carries the current value. */
  it("summarises the current value in the collapsed header", () => {
    renderPanel(75);

    expect(screen.getByText("75% match confidence")).toBeInTheDocument();
  });

  it("explains what the threshold controls", () => {
    renderPanel();

    expect(
      screen.getByText(
        "Set the match confidence required before this movement sends its keypress.",
      ),
    ).toBeInTheDocument();
  });

  /** The readout is a live region so a screen reader hears the value change as the slider moves. */
  it("announces the value as it changes", () => {
    renderPanel(75);

    const readout = screen.getByText("75%");
    expect(readout.tagName).toBe("OUTPUT");
    expect(readout).toHaveAttribute("aria-live", "polite");
  });

  describe("slider", () => {
    it("bounds the slider by the allowed confidence range", () => {
      renderPanel();

      expect(slider()).toHaveAttribute("aria-valuemin", "30");
      expect(slider()).toHaveAttribute("aria-valuemax", "100");
      expect(slider()).toHaveAttribute("aria-valuenow", "60");
    });

    it("labels both ends of the range", () => {
      renderPanel();

      expect(screen.getByText("30%")).toBeInTheDocument();
      expect(screen.getByText("100%")).toBeInTheDocument();
    });

    it("reports a nudged value one percent at a time", async () => {
      const { onChange } = renderPanel(60);

      slider().focus();
      await userEvent.keyboard("{ArrowRight}");

      expect(onChange).toHaveBeenCalledWith(61);
    });

    it("refuses to go below the minimum confidence", async () => {
      const { onChange } = renderPanel(30);

      slider().focus();
      await userEvent.keyboard("{ArrowLeft}");

      expect(onChange).not.toHaveBeenCalled();
    });

    it("refuses to go above full confidence", async () => {
      const { onChange } = renderPanel(100);

      slider().focus();
      await userEvent.keyboard("{ArrowRight}");

      expect(onChange).not.toHaveBeenCalled();
    });
  });
});
