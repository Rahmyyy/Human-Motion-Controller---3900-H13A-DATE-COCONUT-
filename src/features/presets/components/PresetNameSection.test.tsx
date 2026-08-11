import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import PresetNameSection from "./PresetNameSection";

function renderSection(value = "") {
  const onChange = vi.fn();
  render(<PresetNameSection value={value} onChange={onChange} />);
  return { onChange };
}

const nameField = () => screen.getByLabelText("Name Your Preset");

describe("PresetNameSection", () => {
  it("labels the field and says what the name is for", () => {
    renderSection();

    expect(nameField()).toBeInTheDocument();
    expect(
      screen.getByText("Give your custom preset a name to help you identify it later."),
    ).toBeInTheDocument();
  });

  it("suggests the shape of a good name", () => {
    renderSection();

    expect(nameField()).toHaveAttribute("placeholder", "e.g. Upper Limb Rehab - Mario Kart");
  });

  /** The field is controlled by the dialog above it, so edits are reported, not kept. */
  it("reports the edited name", async () => {
    const { onChange } = renderSection("Mario Kar");

    await userEvent.type(nameField(), "t");

    expect(onChange).toHaveBeenCalledWith("Mario Kart");
  });

  it("takes focus so the clinician can type straight away", () => {
    renderSection();

    expect(nameField()).toHaveFocus();
  });

  describe("length limit", () => {
    it("stops typing past the limit", () => {
      renderSection();

      expect(nameField()).toHaveAttribute("maxlength", "60");
    });

    it("counts the characters used", () => {
      renderSection("Mario Kart");

      expect(screen.getByText("10 / 60")).toBeInTheDocument();
    });

    /** The count is a live region so a screen reader hears it approach the limit. */
    it("announces the count as it changes", () => {
      renderSection();

      expect(screen.getByText("0 / 60")).toHaveAttribute("aria-live", "polite");
    });
  });

  /** Both the reassurance and the counter describe the field, so they are wired to it. */
  it("points the field at its help text and counter", () => {
    renderSection();

    expect(nameField()).toHaveAccessibleDescription("You can always rename this later. 0 / 60");
  });
});
