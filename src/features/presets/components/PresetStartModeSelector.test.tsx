import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import PresetStartModeSelector, { type PresetStartMode } from "./PresetStartModeSelector";

function renderSelector(selectedMode: PresetStartMode | null = null) {
  const onSelectMode = vi.fn();
  render(<PresetStartModeSelector selectedMode={selectedMode} onSelectMode={onSelectMode} />);
  return { onSelectMode };
}

const template = () => screen.getByRole("button", { name: /Use Existing Template/ });
const custom = () => screen.getByRole("button", { name: /Create Custom Preset/ });

describe("PresetStartModeSelector", () => {
  it("offers both ways to start, each with what it means", () => {
    renderSelector();

    expect(template()).toBeInTheDocument();
    expect(
      screen.getByText("Start from a predefined movement mapping. Coming soon."),
    ).toBeInTheDocument();
    expect(custom()).toBeInTheDocument();
    expect(screen.getByText("Start from scratch with a blank configuration.")).toBeInTheDocument();
  });

  /** The cards act as a choice, so their pressed state carries the selection. */
  it("marks neither as chosen before a choice is made", () => {
    renderSelector();

    expect(template()).toHaveAttribute("aria-pressed", "false");
    expect(custom()).toHaveAttribute("aria-pressed", "false");
  });

  it("marks the chosen mode as pressed", () => {
    renderSelector("custom");

    expect(custom()).toHaveAttribute("aria-pressed", "true");
    expect(template()).toHaveAttribute("aria-pressed", "false");
  });

  it("keeps the unfinished template option disabled", () => {
    renderSelector();

    expect(template()).toBeDisabled();
  });

  it("reports custom when it is chosen", async () => {
    const { onSelectMode } = renderSelector();

    await userEvent.click(custom());

    expect(onSelectMode).toHaveBeenCalledWith("custom");
  });

  /** The tick repeats the pressed state, which is already announced. */
  it("hides the tick from assistive technology", () => {
    const { container } = render(
      <PresetStartModeSelector selectedMode="custom" onSelectMode={vi.fn()} />,
    );

    expect(container.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
  });

  /** Inside the create dialog, a button with no type would submit the form. */
  it("uses plain buttons", () => {
    renderSelector();

    expect(template()).toHaveAttribute("type", "button");
    expect(custom()).toHaveAttribute("type", "button");
  });
});
