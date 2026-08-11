import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "./select";

function renderSelect({
  contentProps,
  triggerProps,
  ...rootProps
}: React.ComponentProps<typeof Select> & {
  contentProps?: Partial<React.ComponentProps<typeof SelectContent>>;
  triggerProps?: Partial<React.ComponentProps<typeof SelectTrigger>>;
} = {}) {
  return render(
    <Select {...rootProps}>
      <SelectTrigger aria-label="Preset" {...triggerProps}>
        <SelectValue placeholder="Choose a preset" />
      </SelectTrigger>
      <SelectContent {...contentProps}>
        <SelectGroup>
          <SelectLabel>Games</SelectLabel>
          <SelectItem value="mario-kart">Mario Kart</SelectItem>
          <SelectItem value="tennis">Tennis</SelectItem>
        </SelectGroup>
        <SelectSeparator />
        <SelectItem value="retired" disabled>
          Retired preset
        </SelectItem>
      </SelectContent>
    </Select>,
  );
}

const trigger = () => screen.getByRole("combobox", { name: "Preset" });

describe("Select", () => {
  it("shows the placeholder until a value is chosen", () => {
    renderSelect();

    expect(trigger()).toHaveTextContent("Choose a preset");
    expect(trigger()).toHaveAttribute("data-placeholder");
  });

  it("shows the chosen option's text once a value is set", () => {
    renderSelect({ value: "tennis" });

    expect(trigger()).toHaveTextContent("Tennis");
    expect(trigger()).not.toHaveAttribute("data-placeholder");
  });

  it("opens its list on the trigger", async () => {
    renderSelect();

    await userEvent.click(trigger());

    expect(screen.getByRole("option", { name: "Mario Kart" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Tennis" })).toBeInTheDocument();
  });

  it("reports the chosen value to its handler", async () => {
    const onValueChange = vi.fn();
    renderSelect({ onValueChange });

    await userEvent.click(trigger());
    await userEvent.click(screen.getByRole("option", { name: "Tennis" }));

    expect(onValueChange).toHaveBeenCalledWith("tennis");
  });

  /** Retired presets stay listed for context but must not be selectable. */
  it("does not report a disabled option as chosen", async () => {
    const onValueChange = vi.fn();
    renderSelect({ onValueChange });

    await userEvent.click(trigger());
    await userEvent.click(screen.getByRole("option", { name: "Retired preset" }));

    expect(onValueChange).not.toHaveBeenCalled();
  });

  it("marks the current option as selected in the list", async () => {
    renderSelect({ value: "tennis" });

    await userEvent.click(trigger());

    expect(screen.getByRole("option", { name: "Tennis" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("option", { name: "Mario Kart" })).toHaveAttribute(
      "aria-selected",
      "false",
    );
  });

  it("groups and labels related options", async () => {
    renderSelect();

    await userEvent.click(trigger());

    expect(screen.getByRole("group", { name: "Games" })).toBeInTheDocument();
    expect(document.querySelector('[data-slot="select-separator"]')).toBeInTheDocument();
  });

  it("takes no interaction while disabled", async () => {
    renderSelect({ disabled: true });

    await userEvent.click(trigger());

    expect(screen.queryByRole("option")).not.toBeInTheDocument();
  });

  describe("trigger size", () => {
    it("defaults to the standard size", () => {
      renderSelect();

      expect(trigger()).toHaveAttribute("data-size", "default");
    });

    it("records a small size", () => {
      renderSelect({ triggerProps: { size: "sm" } });

      expect(trigger()).toHaveAttribute("data-size", "sm");
    });
  });

  describe("content positioning", () => {
    /** Item-aligned is the default, and it suppresses the open animation to avoid a jump. */
    it("aligns to the selected item by default", async () => {
      renderSelect();

      await userEvent.click(trigger());

      expect(document.querySelector('[data-slot="select-content"]')).toHaveAttribute(
        "data-align-trigger",
        "true",
      );
    });

    it("switches to popper positioning when asked", async () => {
      renderSelect({ contentProps: { position: "popper" } });

      await userEvent.click(trigger());

      const content = document.querySelector('[data-slot="select-content"]');
      expect(content).toHaveAttribute("data-align-trigger", "false");
      expect(content).toHaveClass("data-[side=bottom]:translate-y-1");
    });
  });

  it("merges caller class names into the trigger and content", async () => {
    renderSelect({
      triggerProps: { className: "trigger-class" },
      contentProps: { className: "content-class" },
    });

    expect(trigger()).toHaveClass("trigger-class");
    await userEvent.click(trigger());
    expect(document.querySelector('[data-slot="select-content"]')).toHaveClass("content-class");
  });
});
